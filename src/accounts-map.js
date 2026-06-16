/* CapStone Accounts Map — Leaflet + OSM with phased load, cache, clustering */
(function () {
  var GEO_CACHE_KEY = "capstone_geo_cache";
  var MAP_CACHE_KEY = "fp_map_cache";
  var MAP_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
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

  var mapLibsLoaded = false;
  var mapLibsLoading = false;
  var mapLibsWaiters = [];

  var mapState = {
    map: null,
    clusterGroup: null,
    dealByAccount: {},
    located: [],
    noAddress: [],
    loaded: false,
    loading: false,
    geocoding: false,
    showNoAddr: false,
    fitBoundsNext: false,
    truncated: false,
    cacheNote: "",
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

  function normalizeAccount(rec) {
    return {
      id: rec.id,
      Account_Name: str(rec.Account_Name),
      Account_Status: str(rec.Account_Status),
      Phone: str(rec.Phone),
      Latitude_Longitude: str(rec.Latitude_Longitude),
      googlemapreports__Latitude: str(rec.googlemapreports__Latitude),
      googlemapreports__Longitude: str(rec.googlemapreports__Longitude),
      Shipping_Street: str(rec.Shipping_Street),
      Shipping_Street_2: str(rec.Shipping_Street_2),
      Shipping_City: str(rec.Shipping_City),
      Shipping_State: str(rec.Shipping_State),
      Shipping_Code: str(rec.Shipping_Code),
      Billing_Street: str(rec.Billing_Street),
      Billing_City: str(rec.Billing_City),
      Billing_State: str(rec.Billing_State),
      Billing_Code: str(rec.Billing_Code)
    };
  }

  function loadMapCache() {
    try {
      var raw = localStorage.getItem(MAP_CACHE_KEY);
      if (!raw) return null;
      var data = JSON.parse(raw);
      if (!data || !data.savedAt) return null;
      return data;
    } catch (e) { return null; }
  }

  function saveMapCache() {
    try {
      localStorage.setItem(MAP_CACHE_KEY, JSON.stringify({
        savedAt: Date.now(),
        dealByAccount: mapState.dealByAccount,
        located: mapState.located,
        noAddress: mapState.noAddress,
        truncated: mapState.truncated
      }));
    } catch (e) {}
  }

  function cacheIsFresh(data) {
    return data && (Date.now() - data.savedAt) < MAP_CACHE_TTL_MS;
  }

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = src;
      s.async = true;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  function loadStylesheet(href) {
    if (document.querySelector("link[href=\"" + href + "\"]")) return;
    var l = document.createElement("link");
    l.rel = "stylesheet";
    l.href = href;
    document.head.appendChild(l);
  }

  function loadMapLibs(cb) {
    if (mapLibsLoaded) { if (cb) cb(); return Promise.resolve(); }
    if (cb) mapLibsWaiters.push(cb);
    if (mapLibsLoading) return new Promise(function (resolve) { mapLibsWaiters.push(resolve); });
    mapLibsLoading = true;
    loadStylesheet("https://unpkg.com/leaflet@1.9.4/dist/leaflet.css");
    loadStylesheet("https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css");
    loadStylesheet("https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css");
    return loadScript("https://unpkg.com/leaflet@1.9.4/dist/leaflet.js")
      .then(function () {
        return loadScript("https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js");
      })
      .then(function () {
        mapLibsLoaded = true;
        mapLibsLoading = false;
        var waiters = mapLibsWaiters.slice();
        mapLibsWaiters.length = 0;
        waiters.forEach(function (fn) { if (typeof fn === "function") fn(); });
      })
      .catch(function (err) {
        mapLibsLoading = false;
        mapLibsWaiters.length = 0;
        throw err;
      });
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

  function resolveStoredLocation(acc) {
    var lat = parseFloat(acc.googlemapreports__Latitude);
    var lng = parseFloat(acc.googlemapreports__Longitude);
    if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
      return { lat: lat, lng: lng, source: "stored", addrStr: shippingAddrStr(acc) || "Coordinates on file" };
    }
    return null;
  }

  async function geocodeAddress(address, cache) {
    if (!address) return null;
    if (cache[address]) return cache[address];
    var r = await fetchWithTimeout(PROXY, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "geocode", address: address })
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

  async function resolveGeocodeLocation(acc, geoCache) {
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
        dm[accId] = {
          stage: str(deal.Stage),
          pipeline: str(deal.Pipeline) || "",
          dealId: deal.id || "",
          dealName: str(deal.Deal_Name)
        };
      } else if (!existing.dealId && deal.id) {
        existing.dealId = deal.id;
        existing.dealName = str(deal.Deal_Name);
      }
    });
    return dm;
  }

  async function fetchAllPages(action, maxPages) {
    var all = [], page = 1, hasMore = true, truncated = false;
    maxPages = maxPages || 50;
    while (hasMore && page <= maxPages) {
      var r = await fetchWithTimeout(PROXY, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: action, token: A.zohoToken, page: page })
      }, typeof ZOHO_FETCH_MS !== "undefined" ? ZOHO_FETCH_MS : 30000);
      if (!r.ok) {
        if (r.status === 401 && typeof refreshZohoToken === "function") {
          await refreshZohoToken(true);
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
      hasMore = !!(d.info && d.info.more_records);
      if (hasMore && page >= maxPages) truncated = true;
      page++;
      setProgress("Loading " + action.replace("get_", "") + "… " + all.length + (truncated ? "+" : ""));
    }
    return { data: all, truncated: truncated };
  }

  function setProgress(text) {
    var overlayMsg = el("map-overlay-msg");
    if (overlayMsg) overlayMsg.textContent = text || "Loading…";
  }

  function setMapOverlay(show) {
    var overlay = el("map-loading-overlay");
    if (overlay) overlay.style.display = show ? "flex" : "none";
  }

  function updateGeocodeStatus() {
    var status = el("map-geocode-status");
    if (!status) return;
    if (mapState.geocoding) {
      status.style.display = "block";
      status.textContent = "Geocoding remaining addresses in background…";
    } else {
      status.style.display = "none";
      status.textContent = "";
    }
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

  function zohoAccountUrl(accountId) {
    return "https://crm.zoho.com/crm/tab/Accounts/" + encodeURIComponent(accountId);
  }

  function zohoDealUrl(dealId) {
    return "https://crm.zoho.com/crm/tab/Potentials/" + encodeURIComponent(dealId);
  }

  function findDealIdForAccount(accountId) {
    var info = mapState.dealByAccount[accountId];
    if (info && info.dealId) return info.dealId;
    if (typeof A === "undefined" || !A.deals || !A.deals.length) return null;
    var matches = A.deals.filter(function (d) { return d.Account_Id === accountId; });
    if (!matches.length) return null;
    var active = null;
    for (var i = 0; i < matches.length; i++) {
      if (matches[i].Stage === "Active") { active = matches[i]; break; }
    }
    return (active || matches[0]).id;
  }

  function mapSelectDealForAccount(accountId) {
    var dealId = findDealIdForAccount(accountId);
    if (dealId && typeof selectDeal === "function") {
      selectDeal(dealId, { stayOnTab: "deals" });
      if (typeof toast === "function") toast("Deal selected — open Capture when ready.");
      return;
    }
    if (typeof toast === "function") toast("No deal found. Refresh deals on the Deals tab.");
    else alert("No deal found. Refresh deals on the Deals tab first.");
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
    var dealId = info.dealId || findDealIdForAccount(acc.id);

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
    html += "<div class=\"map-popup-actions\">";
    if (dealId) {
      html += "<button type=\"button\" class=\"map-popup-btn\" onclick=\"mapSelectDealForAccount('" + String(acc.id).replace(/'/g, "\\'") + "')\">Select deal in CapStone</button>";
    }
    html += "<a href=\"" + esc(zohoAccountUrl(acc.id)) + "\" target=\"_blank\" rel=\"noopener noreferrer\" class=\"map-popup-link\">Open account in Zoho ↗</a>";
    if (dealId) {
      html += "<a href=\"" + esc(zohoDealUrl(dealId)) + "\" target=\"_blank\" rel=\"noopener noreferrer\" class=\"map-popup-link\">Open deal in Zoho ↗</a>";
    }
    html += "<a href=\"https://www.openstreetmap.org/?mlat=" + acc.lat + "&mlon=" + acc.lng + "#map=16/" + acc.lat + "/" + acc.lng + "\" target=\"_blank\" rel=\"noopener noreferrer\" class=\"map-popup-link\">Open in OpenStreetMap ↗</a>";
    html += "</div></div>";
    return html;
  }

  function ensureClusterGroup() {
    if (!mapState.map || typeof L === "undefined") return null;
    if (!mapState.clusterGroup) {
      mapState.clusterGroup = L.markerClusterGroup({
        maxClusterRadius: 45,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false
      });
      mapState.map.addLayer(mapState.clusterGroup);
    }
    return mapState.clusterGroup;
  }

  function clearMarkers() {
    if (mapState.clusterGroup) mapState.clusterGroup.clearLayers();
  }

  function fitMapToFiltered(filtered) {
    if (!mapState.map || !mapState.fitBoundsNext || !filtered.length) return;
    try {
      var bounds = L.latLngBounds(filtered.map(function (acc) { return [acc.lat, acc.lng]; }));
      mapState.map.fitBounds(bounds, { padding: [36, 36], maxZoom: 12 });
    } catch (e) {}
    mapState.fitBoundsNext = false;
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
    var cluster = ensureClusterGroup();
    if (!cluster) return;
    clearMarkers();
    var filtered = mapState.located.filter(passesFilters);
    filtered.forEach(function (acc) {
      var info = mapState.dealByAccount[acc.id] || {};
      var stage = info.stage || "No Active Deal";
      var color = stageColor(stage);
      var isActive = accountIsActive(acc);
      var pinColor = isActive ? color.pin : "#9ca3af";
      var marker = L.marker([acc.lat, acc.lng], { icon: makePinIcon(pinColor) });
      marker.bindPopup(popupHtml(acc), { maxWidth: 300 });
      cluster.addLayer(marker);
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

    fitMapToFiltered(filtered);
    setTimeout(function () { if (mapState.map) mapState.map.invalidateSize(); }, 80);
  }

  function missingReasonLabel(acc) {
    if (acc.missingReason === "geocode_failed") return "Geocode failed";
    if (acc.missingReason === "no_address") return "No address on file";
    return "";
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
      var reason = missingReasonLabel(acc);
      var html = "<div class=\"map-missing-item\">";
      html += "<div><span class=\"map-missing-name\">" + esc(str(acc.Account_Name)) + "</span>";
      if (reason) html += "<div class=\"map-missing-reason\">" + esc(reason) + "</div>";
      html += "</div>";
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
    if (!subtitle || mapState.loading) return;
    var parts = [mapState.located.length + " mapped", mapState.noAddress.length + " missing address"];
    if (mapState.cacheNote) parts.push(mapState.cacheNote);
    if (mapState.truncated) parts.push("list may be truncated");
    subtitle.textContent = parts.join(" · ");
    var note = el("map-status-missing-note");
    if (note) note.textContent = mapState.noAddress.length + " accounts need address data";
    var cacheNote = el("map-cache-note");
    if (cacheNote) {
      cacheNote.textContent = mapState.cacheNote || "";
      cacheNote.style.display = mapState.cacheNote ? "block" : "none";
    }
  }

  function applyMapFilters() {
    mapState.filters.search = (el("map-f-search") || { value: "" }).value.trim();
    mapState.filters.pipeline = (el("map-f-pipeline") || { value: "" }).value;
    mapState.filters.stage = (el("map-f-stage") || { value: "" }).value;
    mapState.filters.status = (el("map-f-status") || { value: "" }).value;
    renderMapMarkers();
    renderMissingPanel();
  }

  function applyMapDataset(opts) {
    opts = opts || {};
    if (opts.fitBounds) mapState.fitBoundsNext = true;
    populateStageFilter();
    renderLegend();
    applyMapFilters();
    updateSubtitle();
  }

  function restoreFromCache(data, stale) {
    mapState.dealByAccount = data.dealByAccount || {};
    mapState.located = data.located || [];
    mapState.noAddress = data.noAddress || [];
    mapState.truncated = !!data.truncated;
    mapState.loaded = true;
    mapState.cacheNote = stale
      ? "cached · refreshing…"
      : "cached · " + new Date(data.savedAt).toLocaleString();
    applyMapDataset({ fitBounds: true });
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
    ensureClusterGroup();
    setTimeout(function () { if (mapState.map) mapState.map.invalidateSize(); }, 100);
  }

  function splitAccountsByLocation(rawAccounts) {
    var withLoc = [], pendingGeocode = [], withoutLoc = [];
    rawAccounts.forEach(function (rec) {
      var acc = normalizeAccount(rec);
      var stored = resolveStoredLocation(acc);
      if (stored) {
        withLoc.push(Object.assign({}, acc, stored));
        return;
      }
      if (shippingAddrStr(acc) || billingAddrStr(acc)) {
        pendingGeocode.push(acc);
        return;
      }
      acc.missingReason = "no_address";
      withoutLoc.push(acc);
    });
    return { withLoc: withLoc, pendingGeocode: pendingGeocode, withoutLoc: withoutLoc };
  }

  async function geocodePendingAccounts(pending, geoCache) {
    if (!pending.length) return;
    mapState.geocoding = true;
    updateGeocodeStatus();
    var batch = 0;
    for (var i = 0; i < pending.length; i++) {
      var acc = pending[i];
      var loc = await resolveGeocodeLocation(acc, geoCache);
      if (loc) {
        mapState.located.push(Object.assign({}, acc, loc));
        batch++;
      } else {
        acc.missingReason = "geocode_failed";
        mapState.noAddress.push(acc);
      }
      if (batch >= 3 || i === pending.length - 1) {
        batch = 0;
        renderMapMarkers();
        renderMissingPanel();
        updateSubtitle();
        saveMapCache();
      }
      if ((i + 1) % 10 === 0) {
        var status = el("map-geocode-status");
        if (status) status.textContent = "Geocoding… " + (i + 1) + " / " + pending.length;
      }
      await sleep(15);
    }
    mapState.geocoding = false;
    updateGeocodeStatus();
    mapState.cacheNote = "updated · " + new Date().toLocaleTimeString();
    saveMapCache();
    applyMapDataset({});
  }

  async function fetchAndProcessMapData(force) {
    if (typeof refreshZohoToken === "function") {
      var tokOk = await refreshZohoToken();
      if (!tokOk) {
        var cachedOnFail = loadMapCache();
        if (cachedOnFail && cachedOnFail.located && cachedOnFail.located.length) {
          restoreFromCache(cachedOnFail, false);
          mapState.cacheNote = "cached · Zoho refresh failed";
          updateSubtitle();
          var errBox = el("map-err");
          if (errBox) {
            errBox.textContent = (typeof zohoRefreshFailMsg === "function" ? zohoRefreshFailMsg() : "Zoho token refresh failed") + " Showing last cached map.";
            errBox.style.display = "block";
          }
          setMapOverlay(false);
          mapState.loading = false;
          return;
        }
        throw new Error(typeof zohoRefreshFailMsg === "function" ? zohoRefreshFailMsg() : "Zoho token refresh failed");
      }
    }

    var geoCache = loadGeoCache();
    setProgress("Loading accounts…");
    var acctResult = await fetchAllPages("get_accounts", 20);
    setProgress("Loaded " + acctResult.data.length + " accounts. Fetching deals…");
    var dealResult = await fetchAllPages("get_map_deals", 10);
    mapState.dealByAccount = buildDealMap(dealResult.data);
    mapState.truncated = acctResult.truncated || dealResult.truncated;

    var split = splitAccountsByLocation(acctResult.data);
    mapState.located = split.withLoc;
    mapState.noAddress = split.withoutLoc;
    mapState.loaded = true;
    mapState.cacheNote = "";
    mapState.fitBoundsNext = true;

    saveMapCache();
    setMapOverlay(false);
    mapState.loading = false;
    applyMapDataset({ fitBounds: true });
    updateSubtitle();

    if (split.pendingGeocode.length) {
      geocodePendingAccounts(split.pendingGeocode, geoCache);
    } else {
      mapState.cacheNote = "updated · " + new Date().toLocaleTimeString();
      updateSubtitle();
    }
  }

  async function loadAccountsMap(force) {
    if (mapState.loading) return;

    await loadMapLibs();
    ensureMap();

    if (!force) {
      var cached = loadMapCache();
      if (cached && cached.located && cached.located.length) {
        var stale = !cacheIsFresh(cached);
        restoreFromCache(cached, stale);
        if (!stale) return;
        mapState.loading = true;
        fetchAndProcessMapData(true).catch(function (e) {
          mapState.cacheNote = "cached · refresh failed";
          updateSubtitle();
          var errEl = el("map-err");
          if (errEl) { errEl.textContent = e.message || String(e); errEl.style.display = "block"; }
        }).finally(function () {
          mapState.loading = false;
          setMapOverlay(false);
          var btn = el("map-refresh-btn");
          if (btn) { btn.disabled = false; btn.textContent = "↺ Refresh"; }
        });
        return;
      }
    }

    if (mapState.loaded && !force) {
      applyMapDataset({});
      setTimeout(function () { if (mapState.map) mapState.map.invalidateSize(); }, 150);
      return;
    }

    mapState.loading = true;
    setMapOverlay(true);
    var btn = el("map-refresh-btn");
    var err = el("map-err");
    if (btn) { btn.disabled = true; btn.textContent = "Loading…"; }
    if (err) err.style.display = "none";
    mapState.cacheNote = "";

    try {
      await fetchAndProcessMapData(force);
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
    loadMapLibs().then(function () {
      ensureMap();
      var cached = loadMapCache();
      if (cached && cached.located && cached.located.length && !mapState.loaded) {
        restoreFromCache(cached, !cacheIsFresh(cached));
        if (!cacheIsFresh(cached)) {
          loadAccountsMap(true);
          return;
        }
      }
      if (!mapState.loaded) loadAccountsMap(false);
      else {
        applyMapDataset({});
        setTimeout(function () { if (mapState.map) mapState.map.invalidateSize(); }, 150);
      }
    }).catch(function (e) {
      var err = el("map-err");
      if (err) { err.textContent = "Could not load map libraries: " + (e.message || e); err.style.display = "block"; }
    });
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
  window.mapSelectDealForAccount = mapSelectDealForAccount;
})();
