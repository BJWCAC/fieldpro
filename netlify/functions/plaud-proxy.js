const https = require("https");

var PLAUD_API_BASE = process.env.PLAUD_API_BASE || "https://platform.plaud.ai/developer/api";
var PLAUD_REFRESH_URL = process.env.PLAUD_REFRESH_URL ||
  "https://platform.plaud.ai/developer/api/oauth/third-party/access-token/refresh";
var PLAUD_CLIENT_ID = process.env.PLAUD_CLIENT_ID || "client_9c501dad-8a0d-40b2-a7b0-d1cb8787f674";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
  };
}

function httpsJson(opts, body) {
  return new Promise(function (resolve, reject) {
    var req = https.request(opts, function (res) {
      var chunks = [];
      res.on("data", function (c) { chunks.push(c); });
      res.on("end", function () {
        var text = Buffer.concat(chunks).toString("utf8");
        resolve({ status: res.statusCode, body: text });
      });
    });
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

function parsePlaudUrl(path) {
  var base = PLAUD_API_BASE.replace(/\/$/, "");
  var full = base + path;
  var u = new URL(full);
  return { hostname: u.hostname, path: u.pathname + u.search, port: u.port || 443 };
}

async function plaudRequest(accessToken, path, method) {
  var parts = parsePlaudUrl(path);
  var result = await httpsJson({
    hostname: parts.hostname,
    port: parts.port,
    path: parts.path,
    method: method || "GET",
    headers: {
      Authorization: "Bearer " + accessToken,
      Accept: "application/json"
    }
  });
  var json = {};
  try { json = JSON.parse(result.body || "{}"); } catch (e) { json = {}; }
  if (result.status < 200 || result.status >= 300) {
    var errMsg = (json.detail && json.detail[0] && json.detail[0].msg) ||
      json.message ||
      result.body.slice(0, 200) ||
      ("HTTP " + result.status);
    throw new Error("Plaud API " + result.status + ": " + errMsg);
  }
  return json;
}

async function refreshAccessToken(refreshToken) {
  var refreshUrl = new URL(PLAUD_REFRESH_URL);
  var payload = "refresh_token=" + encodeURIComponent(refreshToken);
  var result = await httpsJson({
    hostname: refreshUrl.hostname,
    port: refreshUrl.port || 443,
    path: refreshUrl.pathname,
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
      "Content-Length": Buffer.byteLength(payload)
    }
  }, payload);
  var data = {};
  try { data = JSON.parse(result.body || "{}"); } catch (e) { data = {}; }
  if (result.status < 200 || result.status >= 300) {
    throw new Error("Plaud token refresh failed (" + result.status + "): " + (result.body || "").slice(0, 200));
  }
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token || refreshToken,
    expires_at: data.expires_in ? Date.now() + data.expires_in * 1000 : undefined
  };
}

async function resolveAccessToken(data) {
  if (data.access_token) return { access_token: data.access_token, tokens: null };
  var refreshToken = String(data.refresh_token || "").trim();
  if (!refreshToken) throw new Error("refresh_token or access_token required");
  var tokens = await refreshAccessToken(refreshToken);
  return { access_token: tokens.access_token, tokens: tokens };
}

exports.handler = async function (event) {
  var h = corsHeaders();
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers: h, body: "" };

  try {
    var data = JSON.parse(event.body || "{}");
    var action = String(data.action || "").trim();
    if (!action) {
      return {
        statusCode: 400,
        headers: h,
        body: JSON.stringify({ ok: false, error: "action required" })
      };
    }

    if (action === "refresh") {
      var refreshToken = String(data.refresh_token || "").trim();
      if (!refreshToken) {
        return {
          statusCode: 400,
          headers: h,
          body: JSON.stringify({ ok: false, error: "refresh_token required" })
        };
      }
      var refreshed = await refreshAccessToken(refreshToken);
      return {
        statusCode: 200,
        headers: h,
        body: JSON.stringify({ ok: true, tokens: refreshed })
      };
    }

    var auth = await resolveAccessToken(data);
    var token = auth.access_token;

    if (action === "verify") {
      var user = await plaudRequest(token, "/open/third-party/users/current");
      return {
        statusCode: 200,
        headers: h,
        body: JSON.stringify({ ok: true, user: user, tokens: auth.tokens || undefined })
      };
    }

    if (action === "list_files") {
      var page = Math.max(1, parseInt(data.page, 10) || 1);
      var pageSize = Math.min(100, Math.max(1, parseInt(data.page_size, 10) || 20));
      var files = await plaudRequest(token, "/open/third-party/files/?page=" + page + "&page_size=" + pageSize);
      return {
        statusCode: 200,
        headers: h,
        body: JSON.stringify({ ok: true, result: files, tokens: auth.tokens || undefined })
      };
    }

    if (action === "get_file") {
      var fileId = String(data.file_id || "").trim();
      if (!fileId) {
        return {
          statusCode: 400,
          headers: h,
          body: JSON.stringify({ ok: false, error: "file_id required" })
        };
      }
      var file = await plaudRequest(token, "/open/third-party/files/" + encodeURIComponent(fileId));
      return {
        statusCode: 200,
        headers: h,
        body: JSON.stringify({ ok: true, file: file, tokens: auth.tokens || undefined })
      };
    }

    return {
      statusCode: 400,
      headers: h,
      body: JSON.stringify({ ok: false, error: "Unknown action: " + action })
    };
  } catch (e) {
    return {
      statusCode: 500,
      headers: h,
      body: JSON.stringify({ ok: false, error: e.message || String(e) })
    };
  }
};
