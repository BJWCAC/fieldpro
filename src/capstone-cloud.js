var CapstoneCloud = (function () {
  var API = "https://dulcet-sherbet-40f8f6.netlify.app/.netlify/functions/capstone-api";
  var SESSION_KEY = "fp_cloud_session";
  var SYNC_SINCE_KEY = "fp_cloud_sync_since";
  var ENABLED_KEY = "fp_cloud_sync_enabled";
  var pushTimer = null;

  function apiUrl() { return API; }

  function getSession() {
    try {
      var raw = localStorage.getItem(SESSION_KEY) || "";
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function setSession(sess) {
    try {
      if (sess) localStorage.setItem(SESSION_KEY, JSON.stringify(sess));
      else localStorage.removeItem(SESSION_KEY);
    } catch (e) {}
  }

  function isEnabled() {
    try { return localStorage.getItem(ENABLED_KEY) === "1"; } catch (e) { return false; }
  }

  function setEnabled(on) {
    try { localStorage.setItem(ENABLED_KEY, on ? "1" : "0"); } catch (e) {}
    renderCloudSettingsUI();
  }

  function isLoggedIn() {
    return !!(getSession() && getSession().token);
  }

  function currentUser() {
    var s = getSession();
    return s && s.user ? s.user : null;
  }

  async function request(action, body, opts) {
    opts = opts || {};
    var sess = getSession();
    var headers = { "Content-Type": "application/json" };
    if (sess && sess.token) headers.Authorization = "Bearer " + sess.token;
    var r = await fetch(API, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(Object.assign({ action: action }, body || {}))
    });
    var txt = await r.text();
    var data = {};
    try { data = JSON.parse(txt); } catch (e) {}
    if (!r.ok || data.ok === false) {
      throw new Error((data && data.error) || ("Cloud API " + r.status));
    }
    return data;
  }

  async function health() {
    return request("health", {});
  }

  async function register(email, password, displayName, inviteCode) {
    var d = await request("register", {
      email: email,
      password: password,
      display_name: displayName,
      invite_code: inviteCode
    });
    setSession({ token: d.token, user: d.user });
    if (typeof saveTechnicianSetting === "function" && d.user && d.user.display_name) {
      saveTechnicianSetting(d.user.display_name);
    }
    renderCloudSettingsUI();
    return d;
  }

  async function login(email, password) {
    var d = await request("login", { email: email, password: password });
    setSession({ token: d.token, user: d.user });
    if (typeof saveTechnicianSetting === "function" && d.user && d.user.display_name) {
      saveTechnicianSetting(d.user.display_name);
    }
    renderCloudSettingsUI();
    return d;
  }

  async function logout() {
    try { await request("logout", {}); } catch (e) {}
    setSession(null);
    renderCloudSettingsUI();
  }

  async function validateSession() {
    if (!isLoggedIn()) return false;
    try {
      var d = await request("session", {});
      if (d.user) {
        var s = getSession() || {};
        s.user = d.user;
        setSession(s);
      }
      return true;
    } catch (e) {
      setSession(null);
      renderCloudSettingsUI();
      return false;
    }
  }

  function captureRecordsForSync() {
    if (typeof getHistory !== "function") return [];
    return getHistory().map(function (r) {
      return Object.assign({}, r, {
        updated_at: r.localSavedAt || r.date || new Date().toISOString()
      });
    });
  }

  async function pushCaptures(opts) {
    opts = opts || {};
    if (!isLoggedIn() || !isEnabled()) return { saved: 0, skipped: true };
    var captures = captureRecordsForSync();
    if (!captures.length) return { saved: 0 };
    var d = await request("sync_push", {
      captures: captures,
      include_photos: !!opts.includePhotos
    });
    try { localStorage.setItem(SYNC_SINCE_KEY, new Date().toISOString()); } catch (e) {}
    setCloudSyncStatus("Last cloud backup " + new Date().toLocaleTimeString() + " — " + (d.saved || 0) + " capture(s)");
    return d;
  }

  function mergeCloudCapture(local, remote) {
    var localMs = new Date(local.localSavedAt || local.date || 0).getTime();
    var remoteMs = new Date(remote.updated_at || remote.localSavedAt || remote.date || 0).getTime();
    if (remoteMs > localMs) return Object.assign({}, remote, { localSavedAt: remote.updated_at || remote.localSavedAt });
    return local;
  }

  async function pullCaptures() {
    if (!isLoggedIn() || !isEnabled()) return { merged: 0, skipped: true };
    var since = "";
    try { since = localStorage.getItem(SYNC_SINCE_KEY) || ""; } catch (e) {}
    var d = await request("sync_pull", { since: since || null });
    var remote = d.captures || [];
    if (!remote.length) {
      setCloudSyncStatus("Cloud sync up to date");
      return { merged: 0 };
    }
    if (typeof getHistory !== "function") return { merged: 0 };
    var local = getHistory();
    var byId = {};
    local.forEach(function (r) { byId[r.id] = r; });
    var merged = 0;
    remote.forEach(function (r) {
      if (!r || !r.id) return;
      if (byId[r.id]) {
        byId[r.id] = mergeCloudCapture(byId[r.id], r);
        merged++;
      } else {
        byId[r.id] = r;
        merged++;
      }
    });
    var out = Object.keys(byId).map(function (k) { return byId[k]; });
    out.sort(function (a, b) { return new Date(b.date || 0) - new Date(a.date || 0); });
    try { localStorage.setItem("fp_history", JSON.stringify(out)); } catch (e) {
      throw new Error("Could not merge cloud captures into local History.");
    }
    if (typeof renderHistory === "function") renderHistory();
    if (typeof updateStorageInfo === "function") updateStorageInfo();
    try { localStorage.setItem(SYNC_SINCE_KEY, new Date().toISOString()); } catch (e2) {}
    setCloudSyncStatus("Pulled " + merged + " capture(s) from cloud " + new Date().toLocaleTimeString());
    return { merged: merged };
  }

  async function syncNow(opts) {
    if (!isLoggedIn()) throw new Error("Sign in to use cloud sync.");
    setCloudSyncStatus("Syncing to cloud...", false);
    await pushCaptures(opts);
    await pullCaptures();
    return true;
  }

  function schedulePush(delayMs) {
    if (!isLoggedIn() || !isEnabled()) return;
    if (pushTimer) clearTimeout(pushTimer);
    pushTimer = setTimeout(function () {
      pushTimer = null;
      pushCaptures({ includePhotos: false }).catch(function (e) {
        setCloudSyncStatus("Cloud backup failed: " + e.message, true);
      });
    }, delayMs || 8000);
  }

  function setCloudSyncStatus(msg, isErr) {
    var e = document.getElementById("cloud-sync-status");
    if (!e) return;
    if (!msg) { e.style.display = "none"; e.textContent = ""; return; }
    e.style.display = "block";
    e.textContent = msg;
    e.style.color = isErr ? "#991b1b" : "#2d6b60";
    e.style.background = isErr ? "#fee2e2" : "#fff";
    e.style.borderColor = isErr ? "#ef4444" : "#b2ddd6";
  }

  function renderCloudSettingsUI() {
    var loggedIn = isLoggedIn();
    var user = currentUser();
    var auth = document.getElementById("cloud-auth-panel");
    var account = document.getElementById("cloud-account-panel");
    var toggle = document.getElementById("tog-cloud-sync");
    if (toggle) toggle.classList.toggle("on", isEnabled());
    if (auth) auth.style.display = loggedIn ? "none" : "block";
    if (account) account.style.display = loggedIn ? "block" : "none";
    var who = document.getElementById("cloud-user-label");
    if (who) who.textContent = loggedIn && user ? (user.display_name + " (" + user.email + ")") : "";
  }

  async function init() {
    renderCloudSettingsUI();
    if (!isEnabled() || !isLoggedIn()) return;
    var ok = await validateSession();
    if (!ok) return;
    try {
      await pullCaptures();
    } catch (e) {
      setCloudSyncStatus("Cloud pull skipped: " + e.message, true);
    }
  }

  window.cloudRegister = async function () {
    var email = (document.getElementById("cloud-email") || {}).value || "";
    var password = (document.getElementById("cloud-password") || {}).value || "";
    var name = (document.getElementById("cloud-name") || {}).value || "";
    var invite = (document.getElementById("cloud-invite") || {}).value || "";
    try {
      await register(email, password, name, invite);
      setEnabled(true);
      await syncNow({ includePhotos: false });
      if (typeof showToast === "function") showToast("Cloud account created", 3000);
    } catch (e) {
      setCloudSyncStatus(e.message, true);
      if (typeof showToast === "function") showToast(e.message, 5000);
    }
  };

  window.cloudLogin = async function () {
    var email = (document.getElementById("cloud-email") || {}).value || "";
    var password = (document.getElementById("cloud-password") || {}).value || "";
    try {
      await login(email, password);
      setEnabled(true);
      await syncNow({ includePhotos: false });
      if (typeof showToast === "function") showToast("Signed in to CapStone Cloud", 3000);
    } catch (e) {
      setCloudSyncStatus(e.message, true);
      if (typeof showToast === "function") showToast(e.message, 5000);
    }
  };

  window.cloudLogout = async function () {
    await logout();
    setCloudSyncStatus("");
    if (typeof showToast === "function") showToast("Signed out", 2000);
  };

  window.cloudSyncNow = async function () {
    try {
      await syncNow({ includePhotos: false });
      if (typeof showToast === "function") showToast("Cloud sync complete", 3000);
    } catch (e) {
      setCloudSyncStatus(e.message, true);
      if (typeof showToast === "function") showToast(e.message, 5000);
    }
  };

  window.toggleCloudSync = function () {
    if (!isLoggedIn()) {
      if (typeof showToast === "function") showToast("Sign in first to enable cloud sync", 3500);
      return;
    }
    setEnabled(!isEnabled());
    if (typeof showToast === "function") showToast(isEnabled() ? "Cloud sync ON" : "Cloud sync OFF", 2500);
    if (isEnabled()) schedulePush(2000);
  };

  return {
    apiUrl: apiUrl,
    init: init,
    isLoggedIn: isLoggedIn,
    isEnabled: isEnabled,
    schedulePush: schedulePush,
    pushCaptures: pushCaptures,
    pullCaptures: pullCaptures,
    syncNow: syncNow,
    renderCloudSettingsUI: renderCloudSettingsUI
  };
})();
