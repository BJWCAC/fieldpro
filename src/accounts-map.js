/* CapStone Accounts Map — Leaflet + OSM (aligned with AccountsMap.jsx) */
(function () {
  var GEO_CACHE_KEY = "capstone_geo_cache";
  var MAP_CENTER = [44.5, -93.5];
  var MAP_ZOOM = 7;

  var STAGE_COLORS = {
    Active: { pin: "#22c55e", label: "Active", text: "#15803d" },
    Qualified: { pin: "#3b82f6", label: "Qualified", text: "#1d4ed8" },
    Proposal: { pin: "#f59e0b", label: "Proposal", text: "#b45309" },
    Negotiation: { pin: "#f97316", label: "Negotiation", text: "#c2410c" },
    "Closed Won": { pin: "#8b5cf6", label: "Closed Won", text: "#6d28d9" },
    "Closed Lost": { pin: "#6b7280", label: "Closed Lost", text: "#374151" },
    Prospect: { pin: "#06b6d4", label: "Prospect", text: "#0e7490" },
    "No Deal": { pin: "#9ca3af", label: "No Deal", text: "#6b7280" }
  };
  var DEFAULT_COLOR = { pin: "#64748b", label: "No Active Deal", text: "#475569" };

  var PIPELINE_COLORS = {
    Jobs: "#3b82f6",
    "InHouse Lab": "#a855f7"
  };

  var mapState = {
    map: null,
    markers: [],
    dealByAccount: {},
    located: [],
    noAddress: [],
    loaded: false,
    loading: false,
    showNoAddr: false,
    filters: { search: "", pipeline: "", stage: "", status: "" }
  };

  function str(v) {
    if (v == null) return "";
    if (typeof v === "object") return v.name || v.id || "";
    return String(v);
  }

  function sleep(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
  }

  function loadGeoCache() {
    try { return JSON.parse(localStorage.getItem(GEO_CACHE_KEY) || "{}") || {}; }
    catch (e) { return {}; }
  }

  function saveGeoCache(cache) {
    try { localStorage.setItem(GEO_CACHE_KEY, JSON.stringify(cache)); }
    catch (e) {}
  }

  function shippingAddrStr(acc) {
    return [acc.Shipping_Street, acc.Shipping_Street_2, acc.Shipping_City, acc.Shipping_State, acc.Shipping_Code]
      .filter(Boolean).join(", ");
  }

  function billingAddrStr(acc) {
    return [acc.Billing_Street, acc.Billing_City, acc.Billing_State, acc.Billing_Code]
      .filter(Boolean).join(", ");
  }

  function accountIsActive(acc) {
    return str(acc.Account_Status) !== "Inactive";
  }

  function stageColor(stage) {
    return STAGE_COLORS[stage] || DEFAULT_COLOR;
  }

  async function geocodeAddress(address, cache) {
    if (!address) return null;
    if (cache[address]) return cache[address];
    if (typeof refreshZohoToken === "function") await refreshZohoToken();
    var r = await fetchWithTimeout(PROXY, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "geocode", token: A.zohoToken, address: address })
    }, 30000);
    if (!r.ok) return null;
    var d = await r.json();
    if (d.ok && d.lat != null && d.lng != null) {
      cache[address] = { lat: d.lat, lng: d.lng };
      saveGeoCache(cache);
      return cache[address];
    }
    return null;
  }

  async function resolveLocation(acc, geoCache) {
    var lat = parseFloat(acc.googlemapreports__Latitude);
    var lng = parseFloat(acc.googlemapreports__Longitude);
    if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
      return { lat: lat, lng: lng, source: "stored", addrStr: shippingAddrStr(acc) || "Coordinates on file" };
    }
    var shipStr = shippingAddrStr(acc);
    if (shipStr) {
      var shipCoords = await geocodeAddress(shipStr, geoCache);
      if (shipCoords) return { lat: shipCoords.lat, lng: shipCoords.lng, source: "shipping", addrStr: shipStr };
    }
    var billStr = billingAddrStr(acc);
    if (billStr) {
      var billCoords = await geocodeAddress(billStr, geoCache);
      if (billCoords) return { lat: billCoords.lat, lng: billCoords.lng, source: "billing", addrStr: billStr };
    }
    return null;
  }

  function buildDealMap(deals) {
    var dm = {};
    deals.forEach(function (deal) {
      var accId = deal.Account_Name && deal.Account_Name.id;
      if (!accId) return;
      var existing = dm[accId];
      if (!existing || str(deal.Stage) === "Active") {
        dm[accId] = { stage: str(deal.Stage), pipeline: str(deal.Pipeline) || "" };
      }
    });
    return dm;
  }

  async function fetchAllPages(action, maxPages) {
    var all = [], page = 1, hasMore = true;
    maxPages = maxPages || 50;
    while (hasMore && page <= maxPages) {
      var r = await fetchWithTimeout(PROXY, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: action, token: A.zohoToken, page: page })
      }, typeof ZOHO_FETCH_MS !== "undefined" ? ZOHO_FETCH_MS : 30000);
      if (!r.ok) {
        if (r.status === 401 && typeof refreshZohoToken === "function") {
          await refreshZohoToken();
          r = await fetchWithTimeout(PROXY, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: action, token: A.zohoToken, page: page })
          }, typeof ZOHO_FETCH_MS !== "undefined" ? ZOHO_FETCH_MS : 30000);
        }
        if (!r.ok) throw new Error("Proxy error " + r.status);
      }
      var d = await r.json();
      (d.data || []).forEach(function (rec) { all.push(rec); });
      hasMore = d.info && d.info.more_records;
      page++;
    }
    return all;
  }

  function setProgress(text) {
    var overlayMsg = el("map-overlay-msg");
    var subtitle = el("map-subtitle");
    if (overlayMsg) overlayMsg.textContent = text || "Loading…";
    if (subtitle) subtitle.textContent = text || "Loading…";
  }

  function setMapOverlay(show) {
    var overlay = el("map-loading-overlay");
    if (overlay) overlay.style.display = show ? "flex" : "none";
  }

  function accountStage(acc) {
    var info = mapState.dealByAccount[acc.id] || {};
    return info.stage || "No Active Deal";
  }

  function accountPipeline(acc) {
    var info = mapState.dealByAccount[acc.id] || {};
    return info.pipeline || "";
  }

  function passesFilters(acc) {
    var f = mapState.filters;
    var name = str(acc.Account_Name);
    var stage = accountStage(acc);
    var pipeline = accountPipeline(acc);
    var isActive = accountIsActive(acc);

    if (f.search && name.toLowerCase().indexOf(f.search.toLowerCase()) < 0) return false;
    if (f.pipeline && pipeline !== f.pipeline) return false;
    if (f.stage && stage !== f.stage) return false;
    if (f.status === "Active" && !isActive) return false;
    if (f.status === "Inactive" && isActive) return false;
    return true;
  }

  function makePinIcon(pinColor) {
    return L.divIcon({
      className: "",
      html: "<div style=\"width:18px;height:18px;border-radius:50%;background:" + pinColor + ";border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.4)\"></div>",
      iconSize: [18, 18],
      iconAnchor: [9, 9]
    });
  }

  function popupHtml(acc) {
    var info = mapState.dealByAccount[acc.id] || {};
    var stage = info.stage || "No Active Deal";
    var pipeline = info.pipeline || "";
    var color = stageColor(stage);
    var isActive = accountIsActive(acc);
    var pipColor = PIPELINE_COLORS[pipeline] || "#64748b";

    var sourceLabel = acc.source === "stored" ? ""
      : acc.source === "billing" ? " (billing address)" : "";

    var html = "<div style=\"font-family:'IBM Plex Sans',system-ui,sans-serif;min-width:200px\">";
    html += "<div style=\"font-weight:700;font-size:14px;color:#0f172a;margin-bottom:2px\">" + esc(str(acc.Account_Name)) + "</div>";
    html += "<div style=\"font-size:12px;color:#475569;margin-bottom:8px;line-height:1.4\">";
    html += esc(acc.addrStr || "No address on file") + sourceLabel;
    html += "</div>";
    html += "<div style=\"display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px\">";
    html += "<span style=\"display:inline-block;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600;background:" + color.pin + "22;color:" + color.text + ";border:1px solid " + color.pin + "55\">" + esc(stage) + "</span>";
    if (pipeline) {
      html += "<span style=\"display:inline-block;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600;background:" + pipColor + "22;color:" + pipColor + ";border:1px solid " + pipColor + "55\">" + esc(pipeline) + "</span>";
    }
    if (!isActive) {
      html += "<span style=\"display:inline-block;padding:2px 8px;border-radius:10px;font-size:11px;background:#f1f5f9;color:#94a3b8;border:1px solid #e2e8f0\">Inactive</span>";
    }
    html += "</div>";
    if (acc.Phone) html += "<div style=\"font-size:12px;color:#334155\">" + esc(str(acc.Phone)) + "</div>";
    if (acc.Latitude_Longitude) {
      html += "<div style=\"font-size:11px;color:#94a3b8;margin-top:4px\">Site coords: " + esc(str(acc.Latitude_Longitude)) + "</div>";
    }
    html += "<div style=\"margin-top:8px;border-top:1px solid #e2e8f0;padding-top:6px\">";
    html += "<a href=\"https://www.openstreetmap.org/?mlat=" + acc.lat + "&mlon=" + acc.lng + "#map=16/" + acc.lat + "/" + acc.lng + "\" target=\"_blank\" rel=\"noopener noreferrer\" style=\"font-size:11px;color:#1d4ed8;text-decoration:none\">Open in OpenStreetMap ↗</a>";
    html += "</div></div>";
    return html;
  }

  function clearMarkers() {
    mapState.markers.forEach(function (m) {
      if (mapState.map) mapState.map.removeLayer(m);
    });
    mapState.markers = [];
  }

  function stagesInUse() {
    var stages = { "No Active Deal": true };
    mapState.located.forEach(function (acc) {
      var st = accountStage(acc);
      if (st) stages[st] = true;
    });
    var list = ["Active", "Qualified", "Proposal", "Negotiation", "Closed Won", "Closed Lost", "Prospect", "No Deal", "No Active Deal"];
    return list.filter(function (st) { return stages[st]; });
  }

  function populateStageFilter() {
    var sel = el("map-f-stage");
    if (!sel) return;
    var cur = sel.value;
    var opts = "<option value=\"\">All</option>";
    stagesInUse().forEach(function (st) {
      opts += "<option value=\"" + esc(st) + "\">" + esc(st) + "</option>";
    });
    sel.innerHTML = opts;
    if (cur) sel.value = cur;
  }

  function renderLegend() {
    var leg = el("map-legend");
    if (!leg) return;
    var html = "<div class=\"map-legend-title\">Deal Stage</div>";
    stagesInUse().forEach(function (stage) {
      var c = stageColor(stage);
      html += "<div class=\"map-legend-row\"><span class=\"map-legend-dot\" style=\"background:" + c.pin + "\"></span><span style=\"color:#cbd5e1\">" + esc(c.label || stage) + "</span></div>";
    });
    html += "<div class=\"map-legend-divider\"></div>";
    html += "<div class=\"map-legend-title\">Pipeline</div>";
    Object.keys(PIPELINE_COLORS).forEach(function (name) {
      html += "<div class=\"map-legend-row\"><span class=\"map-legend-dot map-legend-pip\" style=\"background:" + PIPELINE_COLORS[name] + "\"></span><span style=\"color:#cbd5e1\">" + esc(name) + "</span></div>";
    });
    html += "<div class=\"map-legend-divider\"></div>";
    html += "<div class=\"map-legend-row\"><span class=\"map-legend-dot\" style=\"background:#9ca3af\"></span><span style=\"color:#64748b\">Inactive</span></div>";
    leg.innerHTML = html;
  }

  function renderMapMarkers() {
    if (!mapState.map || typeof L === "undefined") return;
    clearMarkers();
    var filtered = mapState.located.filter(passesFilters);
    filtered.forEach(function (acc) {
      var info = mapState.dealByAccount[acc.id] || {};
      var stage = info.stage || "No Active Deal";
      var color = stageColor(stage);
      var isActive = accountIsActive(acc);
      var pinColor = isActive ? color.pin : "#9ca3af";
      var marker = L.marker([acc.lat, acc.lng], { icon: makePinIcon(pinColor) });
      marker.bindPopup(popupHtml(acc), { maxWidth: 280 });
      marker.addTo(mapState.map);
      mapState.markers.push(marker);
    });

    var statusPins = el("map-status-pins");
    if (statusPins) statusPins.textContent = String(filtered.length);

    var statusFilters = el("map-status-filters");
    if (statusFilters) {
      var parts = [];
      if (mapState.filters.pipeline) parts.push(mapState.filters.pipeline);
      if (mapState.filters.stage) parts.push(mapState.filters.stage);
      if (mapState.filters.status) parts.push(mapState.filters.status);
      statusFilters.textContent = parts.length ? " · " + parts.join(" · ") : "";
    }

    var missingBtn = el("map-missing-btn");
    if (missingBtn) missingBtn.textContent = "Missing (" + mapState.noAddress.length + ")";
  }

  function renderMissingPanel() {
    var panel = el("map-missing-panel");
    var list = el("map-missing-list");
    var hdrCount = el("map-missing-hdr-count");
    if (!panel || !list) return;
    if (!mapState.showNoAddr) {
      panel.style.display = "none";
      return;
    }
    panel.style.display = "block";
    var items = mapState.noAddress.filter(passesFilters);
    if (hdrCount) hdrCount.textContent = String(items.length);
    if (!items.length) {
      list.innerHTML = "<div class=\"map-missing-empty\">None match current filters.</div>";
      return;
    }
    list.innerHTML = items.map(function (acc) {
      var info = mapState.dealByAccount[acc.id] || {};
      var stage = info.stage || "No Active Deal";
      var pipeline = info.pipeline || "";
      var sc = stageColor(stage);
      var pc = PIPELINE_COLORS[pipeline] || "#64748b";
      var html = "<div class=\"map-missing-item\">";
      html += "<span class=\"map-missing-name\">" + esc(str(acc.Account_Name)) + "</span>";
      html += "<div class=\"map-missing-badges\">";
      if (pipeline) {
        html += "<span class=\"map-badge\" style=\"background:" + pc + "22;color:" + pc + ";border:1px solid " + pc + "44\">" + esc(pipeline) + "</span>";
      }
      html += "<span class=\"map-badge\" style=\"background:" + sc.pin + "22;color:" + sc.text + ";border:1px solid " + sc.pin + "44\">" + esc(stage) + "</span>";
      html += "</div></div>";
      return html;
    }).join("");
  }

  function updateSubtitle() {
    var subtitle = el("map-subtitle");
    if (!subtitle) return;
    if (mapState.loading) return;
    subtitle.textContent = mapState.located.length + " mapped · " + mapState.noAddress.length + " missing address";
    var note = el("map-status-missing-note");
    if (note) note.textContent = mapState.noAddress.length + " accounts need address data";
  }

  function applyMapFilters() {
    mapState.filters.search = (el("map-f-search") || { value: "" }).value.trim();
    mapState.filters.pipeline = (el("map-f-pipeline") || { value: "" }).value;
    mapState.filters.stage = (el("map-f-stage") || { value: "" }).value;
    mapState.filters.status = (el("map-f-status") || { value: "" }).value;
    renderMapMarkers();
    renderMissingPanel();
  }

  function ensureMap() {
    if (mapState.map || typeof L === "undefined") return;
    var container = el("map-container");
    if (!container) return;
    mapState.map = L.map(container, { center: MAP_CENTER, zoom: MAP_ZOOM, zoomControl: true });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
      maxZoom: 19
    }).addTo(mapState.map);
    setTimeout(function () {
      if (mapState.map) mapState.map.invalidateSize();
    }, 100);
  }

  async function loadAccountsMap(force) {
    if (mapState.loading) return;
    if (mapState.loaded && !force) {
      ensureMap();
      populateStageFilter();
      renderLegend();
      applyMapFilters();
      updateSubtitle();
      setTimeout(function () { if (mapState.map) mapState.map.invalidateSize(); }, 150);
      return;
    }

    mapState.loading = true;
    setMapOverlay(true);
    var btn = el("map-refresh-btn");
    var err = el("map-err");
    if (btn) { btn.disabled = true; btn.textContent = "Loading…"; }
    if (err) err.style.display = "none";
    setProgress("Loading accounts…");

    try {
      if (typeof refreshZohoToken === "function") {
        var tokOk = await refreshZohoToken();
        if (!tokOk) throw new Error("Zoho token refresh failed");
      }

      var geoCache = loadGeoCache();
      var rawAccounts = await fetchAllPages("get_accounts", 20);
      setProgress("Loaded " + rawAccounts.length + " accounts. Fetching deals…");
      var rawDeals = await fetchAllPages("get_map_deals", 10);
      mapState.dealByAccount = buildDealMap(rawDeals);

      setProgress("Resolving locations for " + rawAccounts.length + " accounts…");
      var withLoc = [], withoutLoc = [], done = 0;
      for (var i = 0; i < rawAccounts.length; i++) {
        var acc = rawAccounts[i];
        var loc = await resolveLocation(acc, geoCache);
        if (loc) withLoc.push(Object.assign({}, acc, loc));
        else withoutLoc.push(acc);
        done++;
        if (done % 10 === 0) setProgress("Resolved " + done + " / " + rawAccounts.length + "…");
        await sleep(15);
      }

      mapState.located = withLoc;
      mapState.noAddress = withoutLoc;
      mapState.loaded = true;
      ensureMap();
      populateStageFilter();
      renderLegend();
      applyMapFilters();
      updateSubtitle();
      setProgress("");
    } catch (e) {
      setProgress("");
      if (err) {
        err.textContent = e.message || String(e);
        err.style.display = "block";
      }
    } finally {
      mapState.loading = false;
      setMapOverlay(false);
      if (btn) { btn.disabled = false; btn.textContent = "↺ Refresh"; }
      updateSubtitle();
    }
  }

  function initAccountsMapTab() {
    ensureMap();
    if (!mapState.loaded) loadAccountsMap(false);
    else {
      populateStageFilter();
      renderLegend();
      applyMapFilters();
      updateSubtitle();
      setTimeout(function () { if (mapState.map) mapState.map.invalidateSize(); }, 150);
    }
  }

  function toggleMapMissingPanel() {
    mapState.showNoAddr = !mapState.showNoAddr;
    renderMissingPanel();
    var hideLbl = el("map-missing-hide");
    if (hideLbl) hideLbl.textContent = mapState.showNoAddr ? "▲ Hide" : "▼ Show";
  }

  window.loadAccountsMap = loadAccountsMap;
  window.applyMapFilters = applyMapFilters;
  window.initAccountsMapTab = initAccountsMapTab;
  window.toggleMapMissingPanel = toggleMapMissingPanel;
})();
