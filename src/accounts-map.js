/* CapStone Accounts Map — Leaflet + OSM, Zoho Accounts + Deals */
(function () {
  var GEO_CACHE_KEY = "capstone_geo_cache";
  var MAP_CENTER = [44.5, -93.5];
  var MAP_ZOOM = 7;

  var STAGE_COLORS = {
    Active: "#22c55e",
    Qualified: "#3b82f6",
    Proposal: "#f59e0b",
    Negotiation: "#f97316",
    "Closed Won": "#8b5cf6",
    "Closed Lost": "#6b7280",
    Prospect: "#06b6d4",
    "No Active Deal": "#64748b"
  };

  var STAGE_ORDER = ["Active", "Qualified", "Proposal", "Negotiation", "Closed Won", "Closed Lost", "Prospect", "No Active Deal"];

  var mapState = {
    map: null,
    markers: [],
    accounts: [],
    dealByAccount: {},
    resolved: [],
    missing: [],
    loaded: false,
    loading: false,
    filters: {
      search: "",
      pipeline: "",
      stage: "",
      status: "",
      showMissing: false
    }
  };

  function str(v) {
    if (v == null) return "";
    if (typeof v === "object") return v.name || v.id || "";
    return String(v);
  }

  function readGeoCache() {
    try {
      return JSON.parse(localStorage.getItem(GEO_CACHE_KEY) || "{}") || {};
    } catch (e) {
      return {};
    }
  }

  function writeGeoCache(cache) {
    try {
      localStorage.setItem(GEO_CACHE_KEY, JSON.stringify(cache));
    } catch (e) {}
  }

  function hasShippingFields(acct) {
    return !!(acct.Shipping_Street || acct.Shipping_Street_2 || acct.Shipping_City || acct.Shipping_State || acct.Shipping_Code);
  }

  function buildShippingAddress(acct) {
    return [acct.Shipping_Street, acct.Shipping_Street_2, acct.Shipping_City, acct.Shipping_State, acct.Shipping_Code]
      .map(function (x) { return String(x || "").trim(); })
      .filter(Boolean)
      .join(", ");
  }

  function buildBillingAddress(acct) {
    return [acct.Billing_Street, acct.Billing_City, acct.Billing_State, acct.Billing_Code]
      .map(function (x) { return String(x || "").trim(); })
      .filter(Boolean)
      .join(", ");
  }

  function parseStoredCoords(acct) {
    var lat = parseFloat(acct.googlemapreports__Latitude);
    var lng = parseFloat(acct.googlemapreports__Longitude);
    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat: lat, lng: lng };
    }
    return null;
  }

  async function geocodeAddress(address) {
    var key = String(address || "").trim().toLowerCase();
    if (!key) return null;
    var cache = readGeoCache();
    if (cache[key] && cache[key].lat != null && cache[key].lng != null) {
      return { lat: cache[key].lat, lng: cache[key].lng };
    }
    if (typeof refreshZohoToken === "function") await refreshZohoToken();
    var r = await fetchWithTimeout(PROXY, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "geocode", token: A.zohoToken, address: address })
    }, 30000);
    if (!r.ok) return null;
    var d = await r.json();
    if (d.ok && d.lat != null && d.lng != null) {
      cache[key] = { lat: d.lat, lng: d.lng };
      writeGeoCache(cache);
      return { lat: d.lat, lng: d.lng };
    }
    return null;
  }

  function accountInactive(acct) {
    var s = String(acct.Account_Status || "").trim().toLowerCase();
    return s === "inactive" || s === "closed" || s.indexOf("inactive") >= 0;
  }

  function buildDealMap(deals) {
    var byAcct = {};
    var stageRank = { Active: 100, Negotiation: 80, Proposal: 70, Qualified: 60, Prospect: 50, "Closed Won": 40, "Closed Lost": 30 };
    deals.forEach(function (deal) {
      var acctId = (deal.Account_Name && deal.Account_Name.id) || "";
      if (!acctId) return;
      var stage = str(deal.Stage) || "";
      var pipeline = str(deal.Pipeline) || "";
      var existing = byAcct[acctId];
      if (!existing) {
        byAcct[acctId] = { stage: stage, pipeline: pipeline, hasActive: stage === "Active" };
        return;
      }
      if (stage === "Active") {
        existing.stage = "Active";
        existing.hasActive = true;
        if (pipeline) existing.pipeline = pipeline;
        return;
      }
      if (existing.hasActive) {
        if (pipeline && !existing.pipeline) existing.pipeline = pipeline;
        return;
      }
      var curRank = stageRank[existing.stage] || 0;
      var newRank = stageRank[stage] || 0;
      if (newRank > curRank) {
        existing.stage = stage;
        if (pipeline) existing.pipeline = pipeline;
      } else if (pipeline && !existing.pipeline) {
        existing.pipeline = pipeline;
      }
    });
    return byAcct;
  }

  async function fetchAllPages(action) {
    var all = [], page = 1, hasMore = true;
    while (hasMore && page <= 50) {
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
      var msg = el("map-load-msg");
      if (msg) msg.textContent = "Loading " + action.replace("get_", "") + "… page " + page + " (" + all.length + ")";
    }
    return all;
  }

  async function resolveLocations(accounts) {
    var resolved = [], missing = [];
    var total = accounts.length;
    for (var i = 0; i < accounts.length; i++) {
      var acct = accounts[i];
      var msg = el("map-load-msg");
      if (msg && i % 5 === 0) msg.textContent = "Resolving locations… " + (i + 1) + " / " + total;

      var coords = parseStoredCoords(acct);
      var addressUsed = "";
      var addressType = "";

      if (coords) {
        if (hasShippingFields(acct)) {
          addressUsed = buildShippingAddress(acct);
          addressType = "shipping";
        } else if (buildBillingAddress(acct)) {
          addressUsed = buildBillingAddress(acct);
          addressType = "billing";
        } else {
          addressUsed = "Coordinates on file";
          addressType = "coords";
        }
      } else if (hasShippingFields(acct)) {
        var shipAddr = buildShippingAddress(acct);
        if (shipAddr) {
          coords = await geocodeAddress(shipAddr);
          if (coords) {
            addressUsed = shipAddr;
            addressType = "shipping";
          }
        }
      } else {
        var billAddr = buildBillingAddress(acct);
        if (billAddr) {
          coords = await geocodeAddress(billAddr);
          if (coords) {
            addressUsed = billAddr;
            addressType = "billing";
          }
        }
      }

      var dealInfo = mapState.dealByAccount[acct.id] || { stage: "No Active Deal", pipeline: "" };
      var entry = {
        id: acct.id,
        name: str(acct.Account_Name),
        phone: str(acct.Phone),
        inactive: accountInactive(acct),
        stage: dealInfo.stage || "No Active Deal",
        pipeline: dealInfo.pipeline || "",
        siteCoords: str(acct.Latitude_Longitude),
        lat: coords ? coords.lat : null,
        lng: coords ? coords.lng : null,
        addressUsed: addressUsed,
        addressType: addressType
      };

      if (coords) resolved.push(entry);
      else missing.push(entry);
    }
    return { resolved: resolved, missing: missing };
  }

  function pinColor(entry) {
    if (entry.inactive) return "#9ca3af";
    return STAGE_COLORS[entry.stage] || STAGE_COLORS["No Active Deal"];
  }

  function stageBadgeHtml(stage, inactive) {
    var color = inactive ? "#9ca3af" : (STAGE_COLORS[stage] || STAGE_COLORS["No Active Deal"]);
    return "<span class='map-badge' style='background:" + color + "22;color:" + color + ";border:1px solid " + color + "55'>" + esc(stage || "No Active Deal") + "</span>";
  }

  function pipelineBadgeHtml(pipeline) {
    if (!pipeline) return "";
    var color = pipeline === "InHouse Lab" ? "#8b5cf6" : "#3b82f6";
    return "<span class='map-badge' style='background:" + color + "22;color:" + color + ";border:1px solid " + color + "55'>" + esc(pipeline) + "</span>";
  }

  function popupHtml(entry) {
    var addrLine = entry.addressUsed || "—";
    if (entry.addressType === "billing" && addrLine !== "Coordinates on file") {
      addrLine += " <span style='color:#94a3b8'>(billing address)</span>";
    }
    var html = "<div class='map-popup'>";
    html += "<div class='map-popup-name'>" + esc(entry.name) + "</div>";
    html += "<div class='map-popup-row'>" + addrLine + "</div>";
    if (entry.siteCoords) html += "<div class='map-popup-row'><strong>Site coords:</strong> " + esc(entry.siteCoords) + "</div>";
    html += "<div class='map-popup-badges'>" + stageBadgeHtml(entry.stage, entry.inactive);
    if (entry.pipeline) html += pipelineBadgeHtml(entry.pipeline);
    if (entry.inactive) html += "<span class='map-badge map-badge-inactive'>Inactive</span>";
    html += "</div>";
    if (entry.phone) html += "<div class='map-popup-row'>" + esc(entry.phone) + "</div>";
    if (entry.lat != null && entry.lng != null) {
      var osmUrl = "https://www.openstreetmap.org/?mlat=" + encodeURIComponent(entry.lat) + "&mlon=" + encodeURIComponent(entry.lng) + "#map=17/" + entry.lat + "/" + entry.lng;
      html += "<div class='map-popup-row'><a href='" + osmUrl + "' target='_blank' rel='noopener noreferrer' class='map-osm-link'>Open in OpenStreetMap ↗</a></div>";
    }
    html += "</div>";
    return html;
  }

  function makePinIcon(color) {
    var svg = "<svg xmlns='http://www.w3.org/2000/svg' width='28' height='36' viewBox='0 0 28 36'><path fill='" + color + "' stroke='#0f172a' stroke-width='1.5' d='M14 0C6.3 0 0 6.3 0 14c0 10.5 14 22 14 22s14-11.5 14-22C28 6.3 21.7 0 14 0z'/><circle cx='14' cy='14' r='5' fill='#fff'/></svg>";
    return L.divIcon({
      html: svg,
      className: "map-pin-icon",
      iconSize: [28, 36],
      iconAnchor: [14, 36],
      popupAnchor: [0, -34]
    });
  }

  function passesFilters(entry) {
    var f = mapState.filters;
    if (f.search && entry.name.toLowerCase().indexOf(f.search.toLowerCase()) < 0) return false;
    if (f.pipeline && entry.pipeline !== f.pipeline) return false;
    if (f.stage) {
      if (f.stage === "No Active Deal") {
        if (entry.stage !== "No Active Deal") return false;
      } else if (entry.stage !== f.stage) return false;
    }
    if (f.status === "active" && entry.inactive) return false;
    if (f.status === "inactive" && !entry.inactive) return false;
    return true;
  }

  function clearMarkers() {
    mapState.markers.forEach(function (m) {
      if (mapState.map) mapState.map.removeLayer(m);
    });
    mapState.markers = [];
  }

  function renderMapMarkers() {
    if (!mapState.map || typeof L === "undefined") return;
    clearMarkers();
    var visible = mapState.resolved.filter(passesFilters);
    visible.forEach(function (entry) {
      var marker = L.marker([entry.lat, entry.lng], { icon: makePinIcon(pinColor(entry)) });
      marker.bindPopup(popupHtml(entry), { maxWidth: 280 });
      marker.addTo(mapState.map);
      mapState.markers.push(marker);
    });
    var countEl = el("map-pin-count");
    if (countEl) countEl.textContent = visible.length + " pins on map";
  }

  function renderMissingPanel() {
    var panel = el("map-missing-panel");
    var list = el("map-missing-list");
    var countEl = el("map-missing-count");
    if (!panel || !list) return;
    if (!mapState.filters.showMissing) {
      panel.style.display = "none";
      return;
    }
    panel.style.display = "block";
    var items = mapState.missing.filter(passesFilters);
    if (countEl) countEl.textContent = items.length + " account" + (items.length === 1 ? "" : "s") + " without location";
    if (!items.length) {
      list.innerHTML = "<div class='map-missing-empty'>No accounts match filters in the missing-location list.</div>";
      return;
    }
    list.innerHTML = items.map(function (entry) {
      return "<div class='map-missing-item'><div class='map-missing-name'>" + esc(entry.name) + "</div><div class='map-missing-badges'>" +
        stageBadgeHtml(entry.stage, entry.inactive) + pipelineBadgeHtml(entry.pipeline) + "</div></div>";
    }).join("");
  }

  function renderLegend() {
    var leg = el("map-legend");
    if (!leg) return;
    var html = "<div class='map-legend-title'>Deal Stage</div>";
    STAGE_ORDER.forEach(function (stage) {
      var c = STAGE_COLORS[stage];
      html += "<div class='map-legend-row'><span class='map-legend-dot' style='background:" + c + "'></span>" + esc(stage) + "</div>";
    });
    html += "<div class='map-legend-title' style='margin-top:8px'>Pipeline</div>";
    html += "<div class='map-legend-row'><span class='map-legend-dot' style='background:#3b82f6'></span>Jobs</div>";
    html += "<div class='map-legend-row'><span class='map-legend-dot' style='background:#8b5cf6'></span>InHouse Lab</div>";
    html += "<div class='map-legend-title' style='margin-top:8px'>Account</div>";
    html += "<div class='map-legend-row'><span class='map-legend-dot' style='background:#9ca3af'></span>Inactive</div>";
    leg.innerHTML = html;
  }

  function applyMapFilters() {
    mapState.filters.search = (el("map-f-search") || { value: "" }).value.trim();
    mapState.filters.pipeline = (el("map-f-pipeline") || { value: "" }).value;
    mapState.filters.stage = (el("map-f-stage") || { value: "" }).value;
    mapState.filters.status = (el("map-f-status") || { value: "" }).value;
    mapState.filters.showMissing = !!(el("map-f-missing") && el("map-f-missing").checked);
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
    renderLegend();
    setTimeout(function () {
      if (mapState.map) mapState.map.invalidateSize();
    }, 100);
  }

  async function loadAccountsMap(force) {
    if (mapState.loading) return;
    if (mapState.loaded && !force) {
      ensureMap();
      applyMapFilters();
      setTimeout(function () { if (mapState.map) mapState.map.invalidateSize(); }, 150);
      return;
    }
    mapState.loading = true;
    var btn = el("map-refresh-btn");
    var msg = el("map-load-msg");
    var err = el("map-err");
    if (btn) { btn.disabled = true; btn.textContent = "Loading…"; }
    if (err) err.style.display = "none";
    if (msg) { msg.textContent = "Connecting to Zoho…"; msg.style.color = "#94a3b8"; }
    try {
      if (typeof refreshZohoToken === "function") {
        var tokOk = await refreshZohoToken();
        if (!tokOk) throw new Error("Zoho token refresh failed");
      }
      var rawAccounts = await fetchAllPages("get_accounts");
      var rawDeals = await fetchAllPages("get_map_deals");
      mapState.accounts = rawAccounts.map(function (rec) {
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
      });
      mapState.dealByAccount = buildDealMap(rawDeals);
      if (msg) msg.textContent = "Resolving " + mapState.accounts.length + " account locations…";
      var loc = await resolveLocations(mapState.accounts);
      mapState.resolved = loc.resolved;
      mapState.missing = loc.missing;
      mapState.loaded = true;
      ensureMap();
      applyMapFilters();
      if (msg) {
        msg.textContent = mapState.resolved.length + " mapped · " + mapState.missing.length + " missing location · " + new Date().toLocaleTimeString();
        msg.style.color = "#22c55e";
      }
    } catch (e) {
      if (msg) { msg.textContent = "Map load failed"; msg.style.color = "#ef4444"; }
      if (err) {
        err.textContent = e.message || String(e);
        err.style.display = "block";
      }
    } finally {
      mapState.loading = false;
      if (btn) { btn.disabled = false; btn.textContent = "Refresh Map Data"; }
    }
  }

  function initAccountsMapTab() {
    ensureMap();
    if (!mapState.loaded) loadAccountsMap(false);
    else {
      applyMapFilters();
      setTimeout(function () { if (mapState.map) mapState.map.invalidateSize(); }, 150);
    }
  }

  window.loadAccountsMap = loadAccountsMap;
  window.applyMapFilters = applyMapFilters;
  window.initAccountsMapTab = initAccountsMapTab;
  window.toggleMapMissingPanel = function () {
    applyMapFilters();
  };
})();
