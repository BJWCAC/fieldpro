/* CapStone Accounts Map — Leaflet + OSM with phased load, cache, clustering */
(function () {
  var GEO_CACHE_KEY = "capstone_geo_cache";
  var MAP_CACHE_KEY = "fp_map_cache_v5";
  var MAP_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
  var MAP_CENTER = [46.0, -94.0];
  var MAP_ZOOM = 6;
  var MAP_FIT_MAX_ZOOM = 6;
  var PIN_SIZE = 12;
  var MEETING_PIN_COLOR = "#a855f7";
  var SITE_EXPAND_ZOOM = 9;
  var DENSE_SITE_THRESHOLD = 5;
  var OVERLAP_GRID_STEP = 0.00012;
  var CLUSTER_MODE_KEY = "fp_map_cluster_mode";
  var LEGEND_HIDDEN_KEY = "fp_map_legend_hidden";
  var CLUSTER_PRESETS = {
    all: { maxClusterRadius: 8, disableClusteringAtZoom: 0 },
    loose: { maxClusterRadius: 12, disableClusteringAtZoom: 4 },
    balanced: { maxClusterRadius: 22, disableClusteringAtZoom: 8 },
    tight: { maxClusterRadius: 36, disableClusteringAtZoom: 12 }
  };

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
  var EXTRA_STAGE_PALETTE = [
    { pin: "#0ea5e9", text: "#0369a1" },
    { pin: "#14b8a6", text: "#0f766e" },
    { pin: "#eab308", text: "#a16207" },
    { pin: "#ec4899", text: "#be185d" },
    { pin: "#6366f1", text: "#4338ca" },
    { pin: "#84cc16", text: "#4d7c0f" },
    { pin: "#f43f5e", text: "#be123c" },
    { pin: "#78716c", text: "#44403c" }
  ];

  var PIPELINE_COLORS = {
    Jobs: "#3b82f6",
    "InHouse Lab": "#a855f7"
  };

  var mapLibsLoaded = false;
  var mapLibsLoading = false;
  var mapLibsWaiters = [];
  var spreadRenderTimer = null;

  var mapState = {
    map: null,
    clusterGroup: null,
    siteMarkersGroup: null,
    spreadLinesGroup: null,
    dealByAccount: {},
    dealsByAccount: {},
    allDealStages: [],
    located: [],
    noAddress: [],
    loaded: false,
    loading: false,
    geocoding: false,
    showNoAddr: false,
    fitBoundsNext: false,
    truncated: false,
    cacheNote: "",
    initialViewDone: false,
    clusterMode: "loose",
    legendHidden: false,
    scheduledMeetings: [],
    rawMapEvents: [],
    activeDealIndex: null,
    eventsModule: "Events",
    filters: { search: "", pipeline: "", stages: [], status: "", showMeetings: true },
    showSitePanel: false,
    activeSitePanel: null,
    pendingSitePanel: null
  };

  function loadClusterMode() {
    try {
      var saved = localStorage.getItem(CLUSTER_MODE_KEY);
      if (saved && CLUSTER_PRESETS[saved]) return saved;
    } catch (e) {}
    return "loose";
  }

  function saveClusterMode(mode) {
    try { localStorage.setItem(CLUSTER_MODE_KEY, mode); }
    catch (e) {}
  }

  function clusterOptionsForMode(mode) {
    var preset = CLUSTER_PRESETS[mode] || CLUSTER_PRESETS.loose;
    return {
      maxClusterRadius: preset.maxClusterRadius,
      disableClusteringAtZoom: preset.disableClusteringAtZoom,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      chunkedLoading: true,
      zoomToBoundsOnClick: true
    };
  }

  function syncClusterModeSelect() {
    var sel = el("map-f-cluster");
    if (sel) sel.value = mapState.clusterMode || "loose";
  }

  function loadLegendHidden() {
    try { return localStorage.getItem(LEGEND_HIDDEN_KEY) === "1"; }
    catch (e) { return false; }
  }

  function saveLegendHidden(hidden) {
    try { localStorage.setItem(LEGEND_HIDDEN_KEY, hidden ? "1" : "0"); }
    catch (e) {}
  }

  function syncLegendToggleButton() {
    var btn = el("map-legend-toggle");
    if (!btn) return;
    btn.textContent = mapState.legendHidden ? "Show legend" : "Hide legend";
  }

  function applyLegendVisibility() {
    var leg = el("map-legend");
    if (leg) leg.style.display = mapState.legendHidden ? "none" : "";
    syncLegendToggleButton();
  }

  function toggleMapLegend() {
    mapState.legendHidden = !mapState.legendHidden;
    saveLegendHidden(mapState.legendHidden);
    applyLegendVisibility();
  }

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
        dealsByAccount: mapState.dealsByAccount,
        allDealStages: mapState.allDealStages,
        located: mapState.located,
        noAddress: mapState.noAddress,
        truncated: mapState.truncated,
        scheduledMeetings: mapState.scheduledMeetings,
        rawMapEvents: mapState.rawMapEvents,
        activeDealIndex: mapState.activeDealIndex,
        eventsModule: mapState.eventsModule
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

  function setInitialActiveFilter() {
    mapState.filters.status = "Active";
    var sel = el("map-f-status");
    if (sel) sel.value = "Active";
  }

  function clearAccountStatusFilter() {
    mapState.filters.status = "";
    var sel = el("map-f-status");
    if (sel) sel.value = "";
  }

  function applyInitialMapView() {
    if (mapState.initialViewDone) return;
    mapState.initialViewDone = true;
    setInitialActiveFilter();
  }

  function accountIsActive(acc) {
    return str(acc.Account_Status) !== "Inactive";
  }

  function stageColor(stage) {
    if (STAGE_COLORS[stage]) return STAGE_COLORS[stage];
    if (stage === "No Active Deal" || stage === "No Deal") return DEFAULT_COLOR;
    var hash = 0;
    for (var i = 0; i < stage.length; i++) hash = ((hash << 5) - hash) + stage.charCodeAt(i);
    var p = EXTRA_STAGE_PALETTE[Math.abs(hash) % EXTRA_STAGE_PALETTE.length];
    return { pin: p.pin, label: stage, text: p.text };
  }

  function validLat(v) {
    return !isNaN(v) && v >= -90 && v <= 90 && Math.abs(v) > 0.0001;
  }

  function validLng(v) {
    return !isNaN(v) && v >= -180 && v <= 180 && Math.abs(v) > 0.0001;
  }

  function parseCoordPair(a, b) {
    var x = parseFloat(a), y = parseFloat(b);
    if (isNaN(x) || isNaN(y) || (x === 0 && y === 0)) return null;
    if (validLat(x) && validLng(y)) return { lat: x, lng: y };
    if (validLat(y) && validLng(x)) return { lat: y, lng: x };
    return null;
  }

  /** Zoho "Main Site Coordinates" (API field Latitude_Longitude) */
  function parseMainSiteCoords(raw) {
    var s = String(raw || "").trim();
    if (!s) return null;
    var nums = s.match(/-?\d+(?:\.\d+)?/g);
    if (nums && nums.length >= 2) return parseCoordPair(nums[0], nums[1]);
    return null;
  }

  function resolveStoredLocation(acc) {
    var main = parseMainSiteCoords(acc.Latitude_Longitude);
    if (main) {
      return {
        lat: main.lat,
        lng: main.lng,
        source: "main_site",
        addrStr: shippingAddrStr(acc) || billingAddrStr(acc) || "Main site coordinates"
      };
    }
    var lat = parseFloat(acc.googlemapreports__Latitude);
    var lng = parseFloat(acc.googlemapreports__Longitude);
    if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
      return { lat: lat, lng: lng, source: "googlemap", addrStr: shippingAddrStr(acc) || "Coordinates on file" };
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

  function buildDealsByAccount(deals) {
    var dba = {};
    (deals || []).forEach(function (deal) {
      var accId = deal.Account_Name && deal.Account_Name.id;
      if (!accId) return;
      if (!dba[accId]) dba[accId] = [];
      dba[accId].push({
        stage: str(deal.Stage),
        pipeline: str(deal.Pipeline) || "",
        dealId: deal.id || "",
        dealName: str(deal.Deal_Name)
      });
    });
    return dba;
  }

  function extractAllDealStages(deals) {
    var seen = {}, list = [];
    (deals || []).forEach(function (deal) {
      var st = str(deal.Stage);
      if (st && !seen[st]) { seen[st] = true; list.push(st); }
    });
    list.sort(function (a, b) { return a.localeCompare(b); });
    return list;
  }

  function accountHasNoDeal(acc) {
    var info = mapState.dealByAccount[acc.id];
    if (!info || !info.dealId) return true;
    var deals = (mapState.dealsByAccount && mapState.dealsByAccount[acc.id]) || [];
    return !deals.length;
  }

  function accountMatchesStageFilter(acc, wantedStage) {
    if (wantedStage === "No Active Deal") return accountHasNoDeal(acc);
    var deals = (mapState.dealsByAccount && mapState.dealsByAccount[acc.id]) || [];
    for (var i = 0; i < deals.length; i++) {
      if (deals[i].stage === wantedStage) return true;
    }
    return accountStage(acc) === wantedStage;
  }

  function buildActiveDealIndex(deals) {
    var dealToAccount = {};
    var activeDealIds = {};
    deals.forEach(function (deal) {
      var accId = deal.Account_Name && deal.Account_Name.id;
      if (!accId || !deal.id) return;
      dealToAccount[deal.id] = {
        accountId: accId,
        dealName: str(deal.Deal_Name),
        stage: str(deal.Stage)
      };
      if (str(deal.Stage) === "Active") activeDealIds[deal.id] = true;
    });
    return { dealToAccount: dealToAccount, activeDealIds: activeDealIds };
  }

  function parseZohoDateTime(raw) {
    if (!raw) return null;
    var d = new Date(raw);
    return isNaN(d.getTime()) ? null : d;
  }

  function formatMeetingWhen(start, end) {
    var s = parseZohoDateTime(start);
    if (!s) return "";
    var out = s.toLocaleString(undefined, {
      weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit"
    });
    var e = parseZohoDateTime(end);
    if (e) {
      out += " – " + e.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
    }
    return out;
  }

  function accountLocById() {
    var byId = {};
    mapState.located.forEach(function (acc) { byId[acc.id] = acc; });
    return byId;
  }

  function findActiveDealForAccount(accountId) {
    var deals = (mapState.dealsByAccount && mapState.dealsByAccount[accountId]) || [];
    for (var i = 0; i < deals.length; i++) {
      if (deals[i].stage === "Active") return deals[i];
    }
    return null;
  }

  function getDealsForAccount(acc) {
    return (mapState.dealsByAccount[acc.id] || []).slice();
  }

  function passesDealFilters(deal, acc) {
    var f = mapState.filters;
    var accountName = str(acc.Account_Name);
    var dealName = str(deal.dealName);
    var isActive = accountIsActive(acc);

    if (f.search) {
      var q = f.search.toLowerCase();
      if (accountName.toLowerCase().indexOf(q) < 0 && dealName.toLowerCase().indexOf(q) < 0) return false;
    }
    if (f.pipeline && str(deal.pipeline) !== f.pipeline) return false;
    if (f.stages && f.stages.length) {
      var st = str(deal.stage) || (deal.dealId ? "" : "No Active Deal");
      if (!st) st = "No Active Deal";
      if (f.stages.indexOf(st) < 0) return false;
    }
    if (f.status === "Active" && !isActive) return false;
    if (f.status === "Inactive" && isActive) return false;
    return true;
  }

  function getFilteredDealsForAccount(acc) {
    return getDealsForAccount(acc).filter(function (d) { return passesDealFilters(d, acc); });
  }

  function buildScheduledMeetings(events, dealIndex, locById) {
    if (!dealIndex || !events || !events.length) return [];
    var meetings = [];
    var now = Date.now();
    var seenIds = {};
    events.forEach(function (ev) {
      if (ev.$event_cancelled === true || ev.$event_cancelled === "true") return;
      if (ev.id && seenIds[ev.id]) return;
      var seModule = str(ev.$se_module);
      var dealId = null;
      var dealName = "";
      var accountId = null;

      if (seModule === "Deals") {
        dealId = ev.What_Id && ev.What_Id.id;
        if (!dealId || !dealIndex.activeDealIds[dealId]) return;
        var dealInfo = dealIndex.dealToAccount[dealId];
        if (!dealInfo) return;
        accountId = dealInfo.accountId;
        dealName = dealInfo.dealName;
      } else if (seModule === "Accounts") {
        accountId = ev.What_Id && ev.What_Id.id;
        if (!accountId) return;
        var activeDeal = findActiveDealForAccount(accountId);
        if (!activeDeal) return;
        dealId = activeDeal.dealId;
        dealName = activeDeal.dealName;
      } else {
        return;
      }

      var end = parseZohoDateTime(ev.End_DateTime || ev.Start_DateTime);
      if (!end || end.getTime() < now) return;
      var acc = locById[accountId];
      if (!acc || acc.lat == null || acc.lng == null) return;
      if (ev.id) seenIds[ev.id] = true;
      meetings.push({
        id: ev.id,
        title: str(ev.Event_Title) || "Meeting",
        start: ev.Start_DateTime,
        end: ev.End_DateTime,
        venue: str(ev.Venue) || str(ev.Location) || "",
        dealId: dealId,
        dealName: dealName,
        accountId: accountId,
        accountName: str(acc.Account_Name),
        baseLat: acc.lat,
        baseLng: acc.lng,
        lat: acc.lat,
        lng: acc.lng,
        eventModule: mapState.eventsModule || "Events",
        linkedVia: seModule === "Accounts" ? "account" : "deal"
      });
    });
    meetings.sort(function (a, b) {
      var ta = parseZohoDateTime(a.start);
      var tb = parseZohoDateTime(b.start);
      return (ta ? ta.getTime() : 0) - (tb ? tb.getTime() : 0);
    });
    return meetings;
  }

  function refreshScheduledMeetings() {
    if (!mapState.activeDealIndex) {
      mapState.scheduledMeetings = [];
      return;
    }
    mapState.scheduledMeetings = buildScheduledMeetings(
      mapState.rawMapEvents || [],
      mapState.activeDealIndex,
      accountLocById()
    );
  }

  async function fetchMapEvents(maxPages) {
    var all = [], page = 1, hasMore = true, truncated = false, crmModule = null;
    maxPages = maxPages || 10;
    while (hasMore && page <= maxPages) {
      var body = { action: "get_map_events", token: A.zohoToken, page: page };
      if (crmModule) body.crm_module = crmModule;
      var r = await fetchWithTimeout(PROXY, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      }, typeof ZOHO_FETCH_MS !== "undefined" ? ZOHO_FETCH_MS : 30000);
      if (!r.ok) {
        if (r.status === 401 && typeof refreshZohoToken === "function") {
          await refreshZohoToken(true);
          body.token = A.zohoToken;
          r = await fetchWithTimeout(PROXY, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
          }, typeof ZOHO_FETCH_MS !== "undefined" ? ZOHO_FETCH_MS : 30000);
        }
        if (!r.ok) break;
      }
      var d = await r.json();
      if (page === 1 && d.__fp_module) {
        crmModule = d.__fp_module;
        mapState.eventsModule = crmModule;
      }
      (d.data || []).forEach(function (rec) { all.push(rec); });
      hasMore = !!(d.info && d.info.more_records);
      if (hasMore && page >= maxPages) truncated = true;
      page++;
      setProgress("Loading events… " + all.length + (truncated ? "+" : ""));
    }
    return { data: all, truncated: truncated };
  }

  function findLocatedAccount(accountId) {
    for (var i = 0; i < mapState.located.length; i++) {
      if (mapState.located[i].id === accountId) return mapState.located[i];
    }
    return null;
  }

  function passesMeetingFilters(m) {
    if (!mapState.filters.showMeetings) return false;
    var acc = findLocatedAccount(m.accountId);
    if (!acc) return false;
    var deal = { stage: "Active", pipeline: "", dealId: m.dealId, dealName: m.dealName };
    var deals = mapState.dealsByAccount[m.accountId] || [];
    for (var i = 0; i < deals.length; i++) {
      if (deals[i].dealId === m.dealId) { deal = deals[i]; break; }
    }
    return passesDealFilters(deal, acc);
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
    var deals = getDealsForAccount(acc);
    if (deals.length) {
      return deals.some(function (d) { return passesDealFilters(d, acc); });
    }
    var noDeal = { stage: "No Active Deal", pipeline: "", dealId: "", dealName: "" };
    if (!mapState.filters.stages || !mapState.filters.stages.length) {
      return passesDealFilters(noDeal, acc);
    }
    return mapState.filters.stages.indexOf("No Active Deal") >= 0 && passesDealFilters(noDeal, acc);
  }

  function zohoAccountUrl(accountId) {
    return "https://crm.zoho.com/crm/tab/Accounts/" + encodeURIComponent(accountId);
  }

  function zohoDealUrl(dealId) {
    return "https://crm.zoho.com/crm/tab/Potentials/" + encodeURIComponent(dealId);
  }

  function zohoEventUrl(eventId, eventModule) {
    var mod = eventModule || mapState.eventsModule || "Events";
    return "https://crm.zoho.com/crm/tab/" + mod + "/" + encodeURIComponent(eventId);
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

  function mapSelectDeal(dealId) {
    if (dealId && typeof selectDeal === "function") {
      selectDeal(dealId, { stayOnTab: "deals" });
      if (typeof toast === "function") toast("Deal selected — open Capture when ready.");
      return;
    }
    if (typeof toast === "function") toast("No deal found. Refresh deals on the Deals tab.");
    else alert("No deal found. Refresh deals on the Deals tab first.");
  }

  function mapSelectDealForAccount(accountId) {
    var dealId = findDealIdForAccount(accountId);
    mapSelectDeal(dealId);
  }

  function overlapGroupKey(lat, lng) {
    return Math.round(lat / OVERLAP_GRID_STEP) + "|" + Math.round(lng / OVERLAP_GRID_STEP);
  }

  function spreadPixelRadius(zoom) {
    if (zoom <= 4) return 0;
    if (zoom <= 6) return 4 + (zoom - 4) * 3;
    if (zoom <= 10) return 10 + (zoom - 6) * 7;
    return Math.min(84, 38 + (zoom - 10) * 8);
  }

  function latLngFromPixelOffset(anchor, dx, dy) {
    var pt = mapState.map.latLngToContainerPoint(anchor);
    return mapState.map.containerPointToLatLng(L.point(pt.x + dx, pt.y + dy));
  }

  function compareSpreadItems(a, b) {
    var rank = { hub: 0, "site-summary": 0, deal: 1, meeting: 2, account: 3 };
    var ra = rank[a.kind] != null ? rank[a.kind] : 9;
    var rb = rank[b.kind] != null ? rank[b.kind] : 9;
    if (ra !== rb) return ra - rb;
    if (a.kind === "deal") {
      return str(a.data.deal.dealName).localeCompare(str(b.data.deal.dealName));
    }
    if (a.kind === "meeting") {
      var ta = parseZohoDateTime(a.data.start);
      var tb = parseZohoDateTime(b.data.start);
      return (ta ? ta.getTime() : 0) - (tb ? tb.getTime() : 0);
    }
    return str(a.data.Account_Name || (a.data.acc && a.data.acc.Account_Name) || "")
      .localeCompare(str(b.data.Account_Name || (b.data.acc && b.data.acc.Account_Name) || ""));
  }

  function siteItemCount(site) {
    if (!site) return 0;
    return site.deals.length + site.meetings.length + site.accountsNoDeal.length;
  }

  function isMapSiteExpanded() {
    if (!mapState.map) return false;
    return mapState.map.getZoom() >= SITE_EXPAND_ZOOM;
  }

  function isDenseSite(site) {
    return siteItemCount(site) >= DENSE_SITE_THRESHOLD;
  }

  function countMapPinItems(spreadItems) {
    var n = 0;
    spreadItems.forEach(function (item) {
      if (item.kind === "deal" || item.kind === "account") {
        n++;
        return;
      }
      if (item.kind === "site-summary" || (item.kind === "hub" && item.data && item.data.dense)) {
        var site = item.data.site;
        if (site) n += site.deals.length + site.accountsNoDeal.length;
      }
    });
    return n;
  }

  function flyMapToSite(lat, lng, onDone) {
    if (!mapState.map) return;
    var targetZoom = Math.max(SITE_EXPAND_ZOOM, mapState.map.getZoom());
    mapState.map.flyTo([lat, lng], targetZoom, { duration: 0.45 });
    if (typeof onDone === "function") {
      mapState.map.once("moveend", function () { onDone(); });
    }
  }

  function activateSiteSummary(item, marker) {
    var sm = item.data;
    if (marker && marker.closePopup) marker.closePopup();
    openMapSitePanel(sm.site);
    flyMapToSite(item.baseLat, item.baseLng);
  }

  function bindSiteSummaryMarkerEvents(marker, item) {
    marker.on("click", function (e) {
      if (typeof L !== "undefined" && L.DomEvent) L.DomEvent.stopPropagation(e);
      activateSiteSummary(item, marker);
    });
  }

  function expandedMultiSiteKeys(spreadItems) {
    var keys = {};
    spreadItems.forEach(function (item) {
      if (item.kind !== "hub" || !item.data) return;
      keys[overlapGroupKey(item.baseLat, item.baseLng)] = true;
    });
    return keys;
  }

  function useSiteMarkerLayer(item, expandedKeys) {
    if (item.kind === "site-summary") return true;
    if (item.kind === "hub") return true;
    var key = overlapGroupKey(item.baseLat, item.baseLng);
    if (expandedKeys[key] && (item.kind === "hub" || item.kind === "deal" || item.kind === "meeting" || item.kind === "account")) {
      return true;
    }
    return false;
  }

  function addMapMarker(marker, item, expandedKeys, cluster, siteLayer) {
    if (useSiteMarkerLayer(item, expandedKeys) && siteLayer) siteLayer.addLayer(marker);
    else cluster.addLayer(marker);
  }

  function bindExpandedHubMarkerEvents(marker, hub) {
    bindHubMarkerEvents(marker);
    marker.on("click", function () {
      openMapSitePanel(hub.site);
    });
  }

  function applyOverlapSpread(items) {
    if (!mapState.map || !items.length) return items;
    var zoom = mapState.map.getZoom();
    var radiusPx = spreadPixelRadius(zoom);
    var groups = {};
    items.forEach(function (item) {
      item.showSpokeLine = false;
      var key = overlapGroupKey(item.baseLat, item.baseLng);
      if (!groups[key]) {
        groups[key] = { anchor: L.latLng(item.baseLat, item.baseLng), items: [] };
      }
      groups[key].items.push(item);
    });
    Object.keys(groups).forEach(function (key) {
      var group = groups[key];
      group.items.sort(compareSpreadItems);
      if (group.items.length === 1 || radiusPx <= 0) {
        group.items.forEach(function (item) {
          item.displayLat = group.anchor.lat;
          item.displayLng = group.anchor.lng;
          item.anchorLat = group.anchor.lat;
          item.anchorLng = group.anchor.lng;
        });
        return;
      }
      var centerIdx = 0;
      for (var ci = 0; ci < group.items.length; ci++) {
        if (group.items[ci].kind === "hub" || group.items[ci].kind === "site-summary") {
          centerIdx = ci;
          break;
        }
      }
      if (group.items[centerIdx].kind !== "hub" && group.items[centerIdx].kind !== "site-summary") {
        for (var cj = 0; cj < group.items.length; cj++) {
          if (group.items[cj].kind === "deal" || group.items[cj].kind === "account") {
            centerIdx = cj;
            break;
          }
        }
      }
      var center = group.items[centerIdx];
      center.displayLat = group.anchor.lat;
      center.displayLng = group.anchor.lng;
      center.anchorLat = group.anchor.lat;
      center.anchorLng = group.anchor.lng;
      center.showSpokeLine = false;

      var satellites = [];
      group.items.forEach(function (item, idx) {
        if (idx !== centerIdx) satellites.push(item);
      });
      var satCount = satellites.length;
      var ringRadius = radiusPx * 0.82;
      if (satCount > 5) ringRadius = ringRadius * (1 + (satCount - 5) * 0.06);
      satellites.forEach(function (item, idx) {
        var angle = (2 * Math.PI * idx) / satCount - Math.PI / 2;
        var dx = Math.cos(angle) * ringRadius;
        var dy = Math.sin(angle) * ringRadius;
        var ll = latLngFromPixelOffset(group.anchor, dx, dy);
        item.displayLat = ll.lat;
        item.displayLng = ll.lng;
        item.anchorLat = group.anchor.lat;
        item.anchorLng = group.anchor.lng;
        item.showSpokeLine = true;
      });
    });
    return items;
  }

  function collectSpreadMarkerItems(filtered, meetingFiltered) {
    var sites = {};

    function ensureSite(acc) {
      var key = overlapGroupKey(acc.lat, acc.lng);
      if (!sites[key]) {
        sites[key] = {
          acc: acc,
          baseLat: acc.lat,
          baseLng: acc.lng,
          deals: [],
          meetings: [],
          accountsNoDeal: []
        };
      }
      return sites[key];
    }

    filtered.forEach(function (acc) {
      var site = ensureSite(acc);
      var deals = getFilteredDealsForAccount(acc);
      if (deals.length) {
        deals.forEach(function (deal) {
          site.deals.push({ deal: deal, acc: acc });
        });
      } else if (!getDealsForAccount(acc).length) {
        site.accountsNoDeal.push(acc);
      }
    });

    meetingFiltered.forEach(function (m) {
      var acc = findLocatedAccount(m.accountId);
      if (!acc) return;
      var site = ensureSite(acc);
      site.meetings.push(m);
    });

    var items = [];
    var expanded = isMapSiteExpanded();
    Object.keys(sites).forEach(function (key) {
      var site = sites[key];
      var satCount = siteItemCount(site);
      var useHub = satCount > 1;

      if (useHub) {
        var primaryDeal = "";
        var primaryDealId = "";
        for (var i = 0; i < site.deals.length; i++) {
          if (site.deals[i].deal.stage === "Active") {
            primaryDeal = site.deals[i].deal.dealName;
            primaryDealId = site.deals[i].deal.dealId;
            break;
          }
        }
        if (!primaryDealId && site.deals.length) {
          primaryDeal = site.deals[0].deal.dealName;
          primaryDealId = site.deals[0].deal.dealId;
        }

        if (!expanded) {
          items.push({
            kind: "site-summary",
            data: {
              acc: site.acc,
              site: site,
              count: satCount,
              primaryDealName: primaryDeal
            },
            baseLat: site.baseLat,
            baseLng: site.baseLng
          });
          return;
        }

        var dense = isDenseSite(site);
        items.push({
          kind: "hub",
          data: {
            acc: site.acc,
            primaryDealName: primaryDeal,
            primaryDealId: primaryDealId,
            site: site,
            dense: dense,
            count: satCount
          },
          baseLat: site.baseLat,
          baseLng: site.baseLng
        });
        site.deals.forEach(function (d) {
          items.push({ kind: "deal", data: d, baseLat: site.baseLat, baseLng: site.baseLng });
        });
        site.meetings.forEach(function (m) {
          items.push({ kind: "meeting", data: m, baseLat: site.baseLat, baseLng: site.baseLng });
        });
        site.accountsNoDeal.forEach(function (acc) {
          items.push({ kind: "account", data: acc, baseLat: site.baseLat, baseLng: site.baseLng });
        });
      } else if (site.deals.length === 1) {
        items.push({ kind: "deal", data: site.deals[0], baseLat: site.baseLat, baseLng: site.baseLng });
      } else if (site.meetings.length === 1) {
        items.push({ kind: "meeting", data: site.meetings[0], baseLat: site.baseLat, baseLng: site.baseLng });
      } else if (site.accountsNoDeal.length === 1) {
        items.push({ kind: "account", data: site.accountsNoDeal[0], baseLat: site.baseLat, baseLng: site.baseLng });
      }
    });

    return applyOverlapSpread(items);
  }

  function scheduleSpreadRender() {
    if (spreadRenderTimer) clearTimeout(spreadRenderTimer);
    spreadRenderTimer = setTimeout(function () {
      spreadRenderTimer = null;
      if (mapState.loaded && mapState.map) renderMapMarkers();
    }, 40);
  }

  function bindMapSpreadHandlers() {
    if (!mapState.map || mapState.map.__fpSpreadBound) return;
    mapState.map.__fpSpreadBound = true;
    mapState.map.on("zoomend", scheduleSpreadRender);
  }

  function ensureSpreadLinesLayer() {
    if (!mapState.map || typeof L === "undefined") return;
    if (!mapState.spreadLinesGroup) {
      mapState.spreadLinesGroup = L.layerGroup().addTo(mapState.map);
    }
  }

  function clearSpreadLines() {
    if (mapState.spreadLinesGroup) mapState.spreadLinesGroup.clearLayers();
  }

  function renderSpreadLines(items) {
    ensureSpreadLinesLayer();
    clearSpreadLines();
    if (!mapState.spreadLinesGroup) return;
    items.forEach(function (item) {
      if (!item.showSpokeLine) return;
      var color = item.kind === "meeting" ? MEETING_PIN_COLOR
        : item.kind === "deal" ? stageColor(item.data.deal.stage).pin
        : "#64748b";
      L.polyline(
        [[item.anchorLat, item.anchorLng], [item.displayLat, item.displayLng]],
        {
          color: color,
          weight: 2,
          opacity: 0.6,
          dashArray: item.kind === "meeting" ? "5 4" : "3 4",
          interactive: false,
          className: "map-spread-line"
        }
      ).addTo(mapState.spreadLinesGroup);
    });
  }

  function makePinIcon(pinColor) {
    var s = PIN_SIZE;
    var half = Math.round(s / 2);
    return L.divIcon({
      className: "",
      html: "<div style=\"width:" + s + "px;height:" + s + "px;border-radius:50%;background:" + pinColor + ";border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,0.45)\"></div>",
      iconSize: [s, s],
      iconAnchor: [half, half]
    });
  }

  function bindHubLabelDismiss() {
    if (!mapState.map || mapState.map.__fpHubDismiss) return;
    mapState.map.__fpHubDismiss = true;
    mapState.map.on("click", function () {
      document.querySelectorAll(".map-hub-label-visible").forEach(function (el) {
        el.classList.remove("map-hub-label-visible");
      });
    });
  }

  function bindHubMarkerEvents(marker) {
    marker.on("click", function (e) {
      if (typeof L !== "undefined" && L.DomEvent) L.DomEvent.stopPropagation(e);
      document.querySelectorAll(".map-hub-label-visible").forEach(function (el) {
        if (el !== marker.getElement()) el.classList.remove("map-hub-label-visible");
      });
      var el = marker.getElement();
      if (el) el.classList.add("map-hub-label-visible");
    });
  }

  function makeHubIcon(acc, primaryDealName, opts) {
    opts = opts || {};
    var name = esc(str(acc.Account_Name)).substring(0, 30);
    var dealLine = primaryDealName
      ? "<div class=\"map-hub-deal\">" + esc(str(primaryDealName).substring(0, 34)) + "</div>"
      : "";
    var denseBadge = opts.dense && opts.count
      ? "<span class=\"map-hub-dense-badge\">" + esc(String(opts.count)) + "</span>"
      : "";
    var denseHint = opts.dense
      ? "<div class=\"map-hub-deal\">" + esc(String(opts.count)) + " items — tap for list</div>"
      : "";
    var hubClass = opts.dense ? "map-hub map-hub-dense-target" : "map-hub";
    return L.divIcon({
      className: "map-hub-wrap",
      html: "<div class=\"" + hubClass + "\"><div class=\"map-hub-dot\" title=\"Tap for site details\">" + denseBadge + "</div><div class=\"map-hub-label\">" + name + dealLine + denseHint + "</div></div>",
      iconSize: opts.dense ? [40, 40] : [16, 16],
      iconAnchor: opts.dense ? [20, 20] : [8, 8]
    });
  }

  function makeSiteSummaryIcon(count) {
    var wrap = 40;
    var half = wrap / 2;
    var badge = count > 99 ? "99+" : String(count);
    return L.divIcon({
      className: "map-site-summary-wrap",
      html: "<div class=\"map-site-summary\"><div class=\"map-site-summary-dot\"></div><span class=\"map-site-summary-badge\">" + esc(badge) + "</span></div>",
      iconSize: [wrap, wrap],
      iconAnchor: [half, half]
    });
  }

  function makeMeetingPinIcon() {
    var s = PIN_SIZE + 4;
    var half = Math.round(s / 2);
    return L.divIcon({
      className: "",
      html: "<div style=\"width:" + s + "px;height:" + s + "px;transform:rotate(45deg);background:" + MEETING_PIN_COLOR + ";border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.5)\"></div>",
      iconSize: [s, s],
      iconAnchor: [half, half]
    });
  }

  function meetingPopupHtml(m) {
    var html = "<div style=\"font-family:'IBM Plex Sans',system-ui,sans-serif;min-width:200px\">";
    html += "<div style=\"font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:" + MEETING_PIN_COLOR + ";margin-bottom:4px\">Scheduled meeting</div>";
    html += "<div style=\"font-weight:700;font-size:14px;color:#0f172a;margin-bottom:2px\">" + esc(m.title) + "</div>";
    html += "<div style=\"font-size:12px;color:#475569;margin-bottom:6px\">" + esc(formatMeetingWhen(m.start, m.end)) + "</div>";
    html += "<div style=\"font-size:12px;color:#334155;margin-bottom:4px\"><strong>" + esc(m.accountName) + "</strong></div>";
    html += "<div style=\"font-size:12px;color:#64748b;margin-bottom:6px\">Deal: " + esc(m.dealName) + "</div>";
    if (m.venue) {
      html += "<div style=\"font-size:11px;color:#64748b;margin-bottom:6px\">" + esc(m.venue) + "</div>";
    }
    if (m.linkedVia === "account") {
      html += "<div style=\"font-size:10px;color:#94a3b8;margin-bottom:6px\">Linked to account in Zoho</div>";
    }
    html += "<div class=\"map-popup-actions\">";
    html += "<button type=\"button\" class=\"map-popup-btn\" onclick=\"mapSelectDeal('" + String(m.dealId).replace(/'/g, "\\'") + "')\">Select deal in CapStone</button>";
    html += "<a href=\"" + esc(zohoEventUrl(m.id, m.eventModule)) + "\" target=\"_blank\" rel=\"noopener noreferrer\" class=\"map-popup-link\">Open meeting in Zoho ↗</a>";
    html += "<a href=\"" + esc(zohoDealUrl(m.dealId)) + "\" target=\"_blank\" rel=\"noopener noreferrer\" class=\"map-popup-link\">Open deal in Zoho ↗</a>";
    html += "</div></div>";
    return html;
  }

  function dealPopupHtml(dealWrap) {
    var deal = dealWrap.deal;
    var acc = dealWrap.acc;
    var stage = deal.stage || "No Active Deal";
    var pipeline = deal.pipeline || "";
    var color = stageColor(stage);
    var isActive = accountIsActive(acc);
    var pipColor = PIPELINE_COLORS[pipeline] || "#64748b";

    var html = "<div style=\"font-family:'IBM Plex Sans',system-ui,sans-serif;min-width:200px\">";
    html += "<div style=\"font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:" + color.pin + ";margin-bottom:4px\">Deal</div>";
    html += "<div style=\"font-weight:700;font-size:14px;color:#0f172a;margin-bottom:2px\">" + esc(str(deal.dealName)) + "</div>";
    html += "<div style=\"font-size:12px;color:#475569;margin-bottom:8px\">" + esc(str(acc.Account_Name)) + "</div>";
    html += "<div style=\"display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px\">";
    html += "<span style=\"display:inline-block;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600;background:" + color.pin + "22;color:" + color.text + ";border:1px solid " + color.pin + "55\">" + esc(stage) + "</span>";
    if (pipeline) {
      html += "<span style=\"display:inline-block;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600;background:" + pipColor + "22;color:" + pipColor + ";border:1px solid " + pipColor + "55\">" + esc(pipeline) + "</span>";
    }
    if (!isActive) {
      html += "<span style=\"display:inline-block;padding:2px 8px;border-radius:10px;font-size:11px;background:#f1f5f9;color:#94a3b8;border:1px solid #e2e8f0\">Inactive account</span>";
    }
    html += "</div>";
    html += "<div class=\"map-popup-actions\">";
    html += "<button type=\"button\" class=\"map-popup-btn\" onclick=\"mapSelectDeal('" + String(deal.dealId).replace(/'/g, "\\'") + "')\">Select deal in CapStone</button>";
    html += "<a href=\"" + esc(zohoAccountUrl(acc.id)) + "\" target=\"_blank\" rel=\"noopener noreferrer\" class=\"map-popup-link\">Open account in Zoho ↗</a>";
    html += "<a href=\"" + esc(zohoDealUrl(deal.dealId)) + "\" target=\"_blank\" rel=\"noopener noreferrer\" class=\"map-popup-link\">Open deal in Zoho ↗</a>";
    html += "</div></div>";
    return html;
  }

  function hubPopupHtml(hubData) {
    var acc = hubData.acc;
    var site = hubData.site;
    var html = "<div style=\"font-family:'IBM Plex Sans',system-ui,sans-serif;min-width:200px\">";
    html += "<div style=\"font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#64748b;margin-bottom:4px\">Site</div>";
    html += "<div style=\"font-weight:700;font-size:14px;color:#0f172a;margin-bottom:2px\">" + esc(str(acc.Account_Name)) + "</div>";
    html += "<div style=\"font-size:12px;color:#475569;margin-bottom:8px;line-height:1.4\">" + esc(acc.addrStr || "No address on file") + "</div>";
    if (site.deals.length) {
      html += "<div style=\"font-size:11px;font-weight:600;color:#334155;margin-bottom:4px\">Deals at this site</div>";
      site.deals.forEach(function (d) {
        var c = stageColor(d.deal.stage);
        html += "<div style=\"font-size:11px;margin-bottom:8px;line-height:1.45\">";
        html += "<span style=\"color:" + c.pin + ";font-weight:600\">" + esc(d.deal.dealName) + "</span>";
        html += " <span style=\"color:#64748b\">· " + esc(d.deal.stage) + "</span>";
        html += "<div style=\"margin-top:4px;display:flex;flex-wrap:wrap;gap:8px\">";
        html += "<a href=\"#\" class=\"map-popup-link\" onclick=\"mapSelectDeal('" + String(d.deal.dealId).replace(/'/g, "\\'") + "');return false;\">Select in CapStone</a>";
        html += "<a href=\"" + esc(zohoDealUrl(d.deal.dealId)) + "\" target=\"_blank\" rel=\"noopener noreferrer\" class=\"map-popup-link\">Open deal in Zoho ↗</a>";
        html += "</div></div>";
      });
    }
    if (site.meetings.length) {
      html += "<div style=\"font-size:11px;font-weight:600;color:#334155;margin:8px 0 4px\">Upcoming meetings</div>";
      site.meetings.forEach(function (m) {
        html += "<div style=\"font-size:11px;color:#64748b;margin-bottom:3px\">" + esc(m.title) + " · " + esc(formatMeetingWhen(m.start, m.end)) + "</div>";
      });
    }
    html += "<div class=\"map-popup-actions\">";
    html += "<a href=\"" + esc(zohoAccountUrl(acc.id)) + "\" target=\"_blank\" rel=\"noopener noreferrer\" class=\"map-popup-link\">Open account in Zoho ↗</a>";
    if (hubData.primaryDealId) {
      html += "<a href=\"" + esc(zohoDealUrl(hubData.primaryDealId)) + "\" target=\"_blank\" rel=\"noopener noreferrer\" class=\"map-popup-link\">Open primary deal in Zoho ↗</a>";
    }
    html += "</div></div>";
    return html;
  }

  function popupHtml(acc) {
    var info = mapState.dealByAccount[acc.id] || {};
    var stage = info.stage || "No Active Deal";
    var pipeline = info.pipeline || "";
    var color = stageColor(stage);
    var isActive = accountIsActive(acc);
    var pipColor = PIPELINE_COLORS[pipeline] || "#64748b";
    var dealId = info.dealId || findDealIdForAccount(acc.id);

    var sourceLabel = acc.source === "main_site" ? " (main site coordinates)"
      : acc.source === "googlemap" || acc.source === "stored" ? ""
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
      html += "<div style=\"font-size:11px;color:#94a3b8;margin-top:4px\">Main site coords: " + esc(str(acc.Latitude_Longitude)) + "</div>";
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

  function rebuildClusterGroup() {
    if (!mapState.map || typeof L === "undefined") return;
    if (mapState.clusterGroup) {
      mapState.map.removeLayer(mapState.clusterGroup);
      mapState.clusterGroup = null;
    }
    var mode = mapState.clusterMode || "loose";
    mapState.clusterGroup = L.markerClusterGroup(clusterOptionsForMode(mode));
    mapState.clusterGroup.__fpMode = mode;
    mapState.map.addLayer(mapState.clusterGroup);
  }

  function ensureClusterGroup() {
    if (!mapState.map || typeof L === "undefined") return null;
    var mode = mapState.clusterMode || "loose";
    if (mapState.clusterGroup && mapState.clusterGroup.__fpMode !== mode) {
      rebuildClusterGroup();
      return mapState.clusterGroup;
    }
    if (!mapState.clusterGroup) {
      mapState.clusterGroup = L.markerClusterGroup(clusterOptionsForMode(mode));
      mapState.clusterGroup.__fpMode = mode;
      mapState.map.addLayer(mapState.clusterGroup);
    }
    return mapState.clusterGroup;
  }

  function ensureSiteMarkersLayer() {
    if (!mapState.map || typeof L === "undefined") return;
    if (!mapState.siteMarkersGroup) {
      mapState.siteMarkersGroup = L.layerGroup();
      mapState.map.addLayer(mapState.siteMarkersGroup);
    }
  }

  function clearMarkers() {
    if (mapState.clusterGroup) mapState.clusterGroup.clearLayers();
    if (mapState.siteMarkersGroup) mapState.siteMarkersGroup.clearLayers();
  }

  function resetMapToMinnesotaView() {
    if (!mapState.map) return;
    mapState.map.setView(MAP_CENTER, MAP_ZOOM, { animate: false });
  }

  function fitMapToFiltered(filtered) {
    if (!mapState.map || !mapState.fitBoundsNext || !filtered.length) return;
    try {
      var bounds = L.latLngBounds(filtered.map(function (acc) { return [acc.lat, acc.lng]; }));
      mapState.map.fitBounds(bounds, { padding: [36, 36], maxZoom: MAP_FIT_MAX_ZOOM });
    } catch (e) {}
    mapState.fitBoundsNext = false;
  }

  function mapStageFilterOptions() {
    var list = (mapState.allDealStages || []).slice();
    if (!list.length) {
      var seen = {};
      mapState.located.forEach(function (acc) {
        var st = accountStage(acc);
        if (st && !seen[st]) { seen[st] = true; list.push(st); }
        var deals = (mapState.dealsByAccount && mapState.dealsByAccount[acc.id]) || [];
        deals.forEach(function (d) {
          if (d.stage && !seen[d.stage]) { seen[d.stage] = true; list.push(d.stage); }
        });
      });
      list.sort(function (a, b) { return a.localeCompare(b); });
    }
    if (mapState.located.some(accountHasNoDeal) && list.indexOf("No Active Deal") < 0) {
      list.push("No Active Deal");
    }
    return list;
  }

  function stagesInUse() {
    var seen = {}, list = [];
    mapState.located.forEach(function (acc) {
      var st = accountStage(acc);
      if (st && !seen[st]) { seen[st] = true; list.push(st); }
      var deals = (mapState.dealsByAccount && mapState.dealsByAccount[acc.id]) || [];
      deals.forEach(function (d) {
        if (d.stage && !seen[d.stage]) { seen[d.stage] = true; list.push(d.stage); }
      });
    });
    if (mapState.located.some(accountHasNoDeal) && !seen["No Active Deal"]) {
      list.push("No Active Deal");
    }
    list.sort(function (a, b) {
      if (a === "No Active Deal") return 1;
      if (b === "No Active Deal") return -1;
      return a.localeCompare(b);
    });
    return list;
  }

  function populateStageFilter() {
    var box = el("map-f-stages");
    if (!box) return;
    var selected = mapState.filters.stages || [];
    var stages = mapStageFilterOptions();
    if (!stages.length) {
      box.innerHTML = "<div class=\"map-stage-empty\">Refresh map to load deal stages from Zoho.</div>";
      return;
    }
    var html = "";
    stages.forEach(function (st) {
      var checked = selected.indexOf(st) >= 0 ? " checked" : "";
      var c = stageColor(st);
      html += "<label class=\"map-stage-chip" + (checked ? " on" : "") + "\" style=\"--chip:" + esc(c.pin) + "\">";
      html += "<input type=\"checkbox\" value=\"" + esc(st) + "\"" + checked + " onchange=\"applyMapFilters();syncMapStageChip(this)\"/>";
      html += "<span class=\"map-stage-chip-dot\"></span>";
      html += "<span>" + esc(st) + "</span></label>";
    });
    box.innerHTML = html;
  }

  function clearMapStageFilter() {
    mapState.filters.stages = [];
    var box = el("map-f-stages");
    if (box) {
      box.querySelectorAll("input[type=checkbox]").forEach(function (cb) {
        cb.checked = false;
        syncMapStageChip(cb);
      });
    }
    applyMapFilters();
  }

  function syncMapStageChip(input) {
    if (!input) return;
    var chip = input.closest ? input.closest(".map-stage-chip") : null;
    if (chip) chip.classList.toggle("on", !!input.checked);
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
    html += "<div class=\"map-legend-row\"><span class=\"map-legend-dot\" style=\"background:#f8fafc;border:2px solid #3b82f6\"></span><span style=\"color:#cbd5e1\">Site hub</span></div>";
    html += "<div class=\"map-legend-row\"><span class=\"map-legend-dot map-legend-summary\"></span><span style=\"color:#cbd5e1\">Multi-item site (zoomed out)</span></div>";
    html += "<div class=\"map-legend-row\"><span class=\"map-legend-dot map-legend-diamond\" style=\"background:" + MEETING_PIN_COLOR + "\"></span><span style=\"color:#cbd5e1\">Scheduled meeting</span></div>";
    html += "<div class=\"map-legend-divider\"></div>";
    html += "<div class=\"map-legend-row\"><span class=\"map-legend-dot\" style=\"background:#9ca3af\"></span><span style=\"color:#64748b\">Inactive</span></div>";
    leg.innerHTML = html;
    applyLegendVisibility();
  }

  function renderMapMarkers() {
    if (!mapState.map || typeof L === "undefined") return;
    var cluster = ensureClusterGroup();
    if (!cluster) return;
    ensureSiteMarkersLayer();
    var siteLayer = mapState.siteMarkersGroup;
    clearMarkers();
    clearSpreadLines();
    var filtered = mapState.located.filter(passesFilters);
    var meetingFiltered = (mapState.scheduledMeetings || []).filter(passesMeetingFilters);
    var spreadItems = collectSpreadMarkerItems(filtered, meetingFiltered);
    var expandedKeys = expandedMultiSiteKeys(spreadItems);
    renderSpreadLines(spreadItems);

    spreadItems.forEach(function (item) {
      if (item.kind === "site-summary") {
        var sm = item.data;
        var summaryMarker = L.marker([item.displayLat, item.displayLng], {
          icon: makeSiteSummaryIcon(sm.count),
          zIndexOffset: 650
        });
        bindSiteSummaryMarkerEvents(summaryMarker, item);
        addMapMarker(summaryMarker, item, expandedKeys, cluster, siteLayer);
        return;
      }
      if (item.kind === "hub") {
        var hub = item.data;
        var hubMarker = L.marker([item.displayLat, item.displayLng], {
          icon: makeHubIcon(hub.acc, hub.primaryDealName, { dense: hub.dense, count: hub.count }),
          zIndexOffset: 400
        });
        hubMarker.bindPopup(hubPopupHtml(hub), { maxWidth: 300 });
        bindExpandedHubMarkerEvents(hubMarker, hub);
        addMapMarker(hubMarker, item, expandedKeys, cluster, siteLayer);
        return;
      }
      if (item.kind === "deal") {
        var dw = item.data;
        var deal = dw.deal;
        var acc = dw.acc;
        var color = stageColor(deal.stage);
        var isActive = accountIsActive(acc);
        var pinColor = isActive ? color.pin : "#9ca3af";
        var dealMarker = L.marker([item.displayLat, item.displayLng], { icon: makePinIcon(pinColor) });
        dealMarker.bindPopup(dealPopupHtml(dw), { maxWidth: 300 });
        addMapMarker(dealMarker, item, expandedKeys, cluster, siteLayer);
        return;
      }
      if (item.kind === "account") {
        var acc2 = item.data;
        var info = mapState.dealByAccount[acc2.id] || {};
        var stage2 = info.stage || "No Active Deal";
        var color2 = stageColor(stage2);
        var isActive2 = accountIsActive(acc2);
        var pinColor2 = isActive2 ? color2.pin : "#9ca3af";
        var accMarker = L.marker([item.displayLat, item.displayLng], { icon: makePinIcon(pinColor2) });
        accMarker.bindPopup(popupHtml(acc2), { maxWidth: 300 });
        addMapMarker(accMarker, item, expandedKeys, cluster, siteLayer);
        return;
      }
      var m = item.data;
      m.lat = item.displayLat;
      m.lng = item.displayLng;
      var meetingMarker = L.marker([item.displayLat, item.displayLng], {
        icon: makeMeetingPinIcon(),
        zIndexOffset: 500
      });
      meetingMarker.bindPopup(meetingPopupHtml(m), { maxWidth: 300 });
      addMapMarker(meetingMarker, item, expandedKeys, cluster, siteLayer);
    });

    var pinCount = countMapPinItems(spreadItems);
    var statusPins = el("map-status-pins");
    if (statusPins) statusPins.textContent = String(pinCount || filtered.length);
    var statusMeetings = el("map-status-meetings");
    if (statusMeetings) {
      statusMeetings.textContent = meetingFiltered.length ? " · " + meetingFiltered.length + " meetings" : "";
    }

    var statusFilters = el("map-status-filters");
    if (statusFilters) {
      var parts = [];
      if (mapState.filters.pipeline) parts.push(mapState.filters.pipeline);
      if (mapState.filters.stages && mapState.filters.stages.length) {
        parts.push(mapState.filters.stages.join(", "));
      }
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

  function mapZoomPendingSite() {
    var site = mapState.pendingSitePanel;
    if (!site) return;
    flyMapToSite(site.baseLat, site.baseLng, function () {
      openMapSitePanel(site);
    });
  }

  function renderMapSitePanel() {
    var panel = el("map-site-panel");
    var list = el("map-site-list");
    var hdrName = el("map-site-hdr-name");
    var hdrCount = el("map-site-hdr-count");
    if (!panel || !list) return;
    if (!mapState.showSitePanel || !mapState.activeSitePanel) {
      panel.style.display = "none";
      return;
    }
    var site = mapState.activeSitePanel;
    var acc = site.acc;
    var count = siteItemCount(site);
    panel.style.display = "block";
    if (hdrName) hdrName.textContent = str(acc.Account_Name);
    if (hdrCount) hdrCount.textContent = String(count);
    var html = "";
    if (acc.addrStr) {
      html += "<div class=\"map-site-addr\">" + esc(acc.addrStr) + "</div>";
    }
    html += "<div class=\"map-site-actions-top\">";
    html += "<a href=\"" + esc(zohoAccountUrl(acc.id)) + "\" target=\"_blank\" rel=\"noopener noreferrer\" class=\"map-site-link\">Open account in Zoho ↗</a>";
    html += "</div>";
    if (site.deals.length) {
      html += "<div class=\"map-site-section-title\">Deals</div>";
      site.deals.forEach(function (d) {
        var deal = d.deal;
        var sc = stageColor(deal.stage);
        var pip = deal.pipeline || "";
        var pc = PIPELINE_COLORS[pip] || "#64748b";
        html += "<div class=\"map-site-item\">";
        html += "<div class=\"map-site-item-main\">";
        html += "<div class=\"map-site-item-name\">" + esc(str(deal.dealName)) + "</div>";
        html += "<div class=\"map-site-item-sub\">" + esc(str((d.acc && d.acc.Account_Name) || acc.Account_Name)) + "</div>";
        html += "</div>";
        html += "<div class=\"map-site-item-badges\">";
        html += "<span class=\"map-badge\" style=\"background:" + sc.pin + "22;color:" + sc.text + ";border:1px solid " + sc.pin + "44\">" + esc(deal.stage) + "</span>";
        if (pip) {
          html += "<span class=\"map-badge\" style=\"background:" + pc + "22;color:" + pc + ";border:1px solid " + pc + "44\">" + esc(pip) + "</span>";
        }
        html += "</div>";
        html += "<div class=\"map-site-item-actions\">";
        html += "<button type=\"button\" class=\"map-site-btn\" onclick=\"mapSelectDeal('" + String(deal.dealId).replace(/'/g, "\\'") + "')\">Select in CapStone</button>";
        html += "<a href=\"" + esc(zohoDealUrl(deal.dealId)) + "\" target=\"_blank\" rel=\"noopener noreferrer\" class=\"map-site-link\">Open deal in Zoho ↗</a>";
        html += "</div></div>";
      });
    }
    if (site.meetings.length) {
      html += "<div class=\"map-site-section-title\">Upcoming meetings</div>";
      site.meetings.forEach(function (m) {
        html += "<div class=\"map-site-item map-site-item-meeting\">";
        html += "<div class=\"map-site-item-main\">";
        html += "<div class=\"map-site-item-name\">" + esc(m.title) + "</div>";
        html += "<div class=\"map-site-item-sub\">" + esc(formatMeetingWhen(m.start, m.end)) + "</div>";
        html += "</div>";
        html += "<div class=\"map-site-item-actions\">";
        html += "<button type=\"button\" class=\"map-site-btn\" onclick=\"mapSelectDeal('" + String(m.dealId).replace(/'/g, "\\'") + "')\">Select deal</button>";
        html += "<a href=\"" + esc(zohoEventUrl(m.id, m.eventModule)) + "\" target=\"_blank\" rel=\"noopener noreferrer\" class=\"map-site-link\">Open meeting in Zoho ↗</a>";
        html += "</div></div>";
      });
    }
    if (site.accountsNoDeal.length) {
      html += "<div class=\"map-site-section-title\">Accounts (no deal)</div>";
      site.accountsNoDeal.forEach(function (acc2) {
        var info = mapState.dealByAccount[acc2.id] || {};
        var st = info.stage || "No Active Deal";
        var sc2 = stageColor(st);
        html += "<div class=\"map-site-item\">";
        html += "<div class=\"map-site-item-main\">";
        html += "<div class=\"map-site-item-name\">" + esc(str(acc2.Account_Name)) + "</div>";
        html += "</div>";
        html += "<div class=\"map-site-item-badges\">";
        html += "<span class=\"map-badge\" style=\"background:" + sc2.pin + "22;color:" + sc2.text + ";border:1px solid " + sc2.pin + "44\">" + esc(st) + "</span>";
        html += "</div>";
        html += "<div class=\"map-site-item-actions\">";
        html += "<button type=\"button\" class=\"map-site-btn\" onclick=\"mapSelectDealForAccount('" + String(acc2.id).replace(/'/g, "\\'") + "')\">Select in CapStone</button>";
        html += "<a href=\"" + esc(zohoAccountUrl(acc2.id)) + "\" target=\"_blank\" rel=\"noopener noreferrer\" class=\"map-site-link\">Open account in Zoho ↗</a>";
        html += "</div></div>";
      });
    }
    if (!site.deals.length && !site.meetings.length && !site.accountsNoDeal.length) {
      html += "<div class=\"map-site-empty\">Nothing to show for this site.</div>";
    }
    list.innerHTML = html;
  }

  function openMapSitePanel(site) {
    if (!site) return;
    mapState.activeSitePanel = site;
    mapState.showSitePanel = true;
    renderMapSitePanel();
    var panel = el("map-site-panel");
    if (panel) {
      panel.classList.add("map-site-panel-open");
      setTimeout(function () {
        try { panel.scrollIntoView({ behavior: "smooth", block: "nearest" }); } catch (e) {}
      }, 80);
    }
    if (typeof toast === "function") toast("Deal list opened below the map");
  }

  function closeMapSitePanel() {
    mapState.showSitePanel = false;
    mapState.activeSitePanel = null;
    var panel = el("map-site-panel");
    if (panel) panel.classList.remove("map-site-panel-open");
    renderMapSitePanel();
  }

  function toggleMapSitePanel() {
    if (mapState.showSitePanel) closeMapSitePanel();
    else if (mapState.activeSitePanel) {
      mapState.showSitePanel = true;
      renderMapSitePanel();
    }
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
    if (mapState.scheduledMeetings && mapState.scheduledMeetings.length) {
      parts.push(mapState.scheduledMeetings.length + " upcoming meetings");
    }
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

  function applyMapClusterMode() {
    var sel = el("map-f-cluster");
    var mode = sel && sel.value ? sel.value : "loose";
    if (!CLUSTER_PRESETS[mode]) mode = "loose";
    if (mode === mapState.clusterMode && mapState.clusterGroup) return;
    mapState.clusterMode = mode;
    saveClusterMode(mode);
    rebuildClusterGroup();
    renderMapMarkers();
  }

  function applyMapFilters() {
    mapState.filters.search = (el("map-f-search") || { value: "" }).value.trim();
    mapState.filters.pipeline = (el("map-f-pipeline") || { value: "" }).value;
    mapState.filters.status = (el("map-f-status") || { value: "" }).value;
    mapState.filters.stages = [];
    var stageBox = el("map-f-stages");
    if (stageBox) {
      stageBox.querySelectorAll("input[type=checkbox]:checked").forEach(function (cb) {
        if (cb.value) mapState.filters.stages.push(cb.value);
      });
    }
    var meetingsCb = el("map-f-meetings");
    mapState.filters.showMeetings = meetingsCb ? !!meetingsCb.checked : true;
    closeMapSitePanel();
    renderMapMarkers();
    renderMissingPanel();
  }

  function applyMapDataset(opts) {
    opts = opts || {};
    if (opts.fitBounds) mapState.fitBoundsNext = true;
    if (opts.mnView) resetMapToMinnesotaView();
    populateStageFilter();
    renderLegend();
    applyMapFilters();
    updateSubtitle();
  }

  function restoreFromCache(data, stale) {
    mapState.dealByAccount = data.dealByAccount || {};
    mapState.dealsByAccount = data.dealsByAccount || {};
    mapState.allDealStages = data.allDealStages || [];
    mapState.located = data.located || [];
    mapState.noAddress = data.noAddress || [];
    mapState.truncated = !!data.truncated;
    mapState.rawMapEvents = data.rawMapEvents || [];
    mapState.activeDealIndex = data.activeDealIndex || null;
    mapState.eventsModule = data.eventsModule || "Events";
    mapState.loaded = true;
    mapState.cacheNote = stale
      ? "cached · refreshing…"
      : "cached · " + new Date(data.savedAt).toLocaleString();
    refreshScheduledMeetings();
    applyMapDataset({ mnView: true });
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
    ensureSiteMarkersLayer();
    ensureSpreadLinesLayer();
    bindMapSpreadHandlers();
    bindHubLabelDismiss();
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

  async function geocodePendingAccounts(pending, geoCache, activeOnly) {
    if (!pending.length) return;
    if (activeOnly) pending = pending.filter(accountIsActive);
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
        refreshScheduledMeetings();
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

  async function fetchAndProcessMapData(force, opts) {
    opts = opts || {};
    var geocodeActiveOnly = !!opts.geocodeActiveOnly;
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
    mapState.activeDealIndex = buildActiveDealIndex(dealResult.data);
    mapState.dealByAccount = buildDealMap(dealResult.data);
    mapState.dealsByAccount = buildDealsByAccount(dealResult.data);
    mapState.allDealStages = extractAllDealStages(dealResult.data);

    var eventResult = { data: [], truncated: false };
    try {
      setProgress("Fetching scheduled meetings…");
      eventResult = await fetchMapEvents(10);
      mapState.rawMapEvents = eventResult.data;
    } catch (evErr) {
      mapState.rawMapEvents = [];
    }

    var split = splitAccountsByLocation(acctResult.data);
    mapState.located = split.withLoc;
    mapState.noAddress = split.withoutLoc;
    refreshScheduledMeetings();
    mapState.truncated = acctResult.truncated || dealResult.truncated || eventResult.truncated;
    mapState.loaded = true;
    mapState.cacheNote = "";

    saveMapCache();
    setMapOverlay(false);
    mapState.loading = false;
    applyMapDataset({ mnView: true });
    updateSubtitle();

    if (split.pendingGeocode.length) {
      geocodePendingAccounts(split.pendingGeocode, geoCache, geocodeActiveOnly);
    } else {
      mapState.cacheNote = "updated · " + new Date().toLocaleTimeString();
      updateSubtitle();
    }
  }

  async function loadAccountsMap(force) {
    if (mapState.loading) return;

    await loadMapLibs();
    ensureMap();

    if (force) clearAccountStatusFilter();

    if (!force) {
      var cached = loadMapCache();
      if (cached && cached.located && cached.located.length) {
        var stale = !cacheIsFresh(cached);
        restoreFromCache(cached, stale);
        applyInitialMapView();
        applyMapFilters();
        if (!stale) return;
        mapState.loading = true;
        fetchAndProcessMapData(true, { geocodeActiveOnly: false }).catch(function (e) {
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
      applyInitialMapView();
      await fetchAndProcessMapData(force, { geocodeActiveOnly: !force });
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
    mapState.clusterMode = loadClusterMode();
    mapState.legendHidden = loadLegendHidden();
    syncClusterModeSelect();
    applyLegendVisibility();
    loadMapLibs().then(function () {
      ensureMap();
      var cached = loadMapCache();
      if (cached && cached.located && cached.located.length && !mapState.loaded) {
        restoreFromCache(cached, !cacheIsFresh(cached));
        applyInitialMapView();
        applyMapFilters();
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
  window.applyMapClusterMode = applyMapClusterMode;
  window.clearMapStageFilter = clearMapStageFilter;
  window.syncMapStageChip = syncMapStageChip;
  window.initAccountsMapTab = initAccountsMapTab;
  window.toggleMapMissingPanel = toggleMapMissingPanel;
  window.toggleMapSitePanel = toggleMapSitePanel;
  window.mapZoomPendingSite = mapZoomPendingSite;
  window.toggleMapLegend = toggleMapLegend;
  window.mapSelectDealForAccount = mapSelectDealForAccount;
  window.mapSelectDeal = mapSelectDeal;
})();
