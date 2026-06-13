const store = require("./lib/capstone-store");

const HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

function jsonResponse(status, body) {
  return { statusCode: status, headers: HEADERS, body: JSON.stringify(body) };
}

function expectedPin() {
  return String(process.env.CAPSTONE_SETTINGS_PIN || "").trim();
}

function checkPin(pin) {
  var expected = expectedPin();
  if (!expected) {
    return { ok: false, error: "CAPSTONE_SETTINGS_PIN not configured on Netlify" };
  }
  if (String(pin || "").trim() !== expected) {
    return { ok: false, error: "Invalid org PIN" };
  }
  return { ok: true };
}

function sanitizeSettings(raw) {
  var s = raw && typeof raw === "object" ? raw : {};
  var plaud = s.plaud && typeof s.plaud === "object" ? s.plaud : {};
  return {
    api_key: String(s.api_key || "").trim(),
    plaud: {
      refresh_token: String(plaud.refresh_token || "").trim(),
      access_token: String(plaud.access_token || "").trim(),
      expires_at: plaud.expires_at || null,
      email: String(plaud.email || "").trim()
    },
    auto_save_zoho: s.auto_save_zoho === "0" ? "0" : "1",
    auto_save_phone_photos: s.auto_save_phone_photos === "0" ? "0" : "1",
    plaud_auto_pull: s.plaud_auto_pull === "0" ? "0" : "1",
    updated_at: new Date().toISOString()
  };
}

exports.handler = async function (event) {
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers: HEADERS, body: "" };

  var data = {};
  try { data = JSON.parse(event.body || "{}"); } catch (e) {
    return jsonResponse(400, { ok: false, error: "Invalid JSON body" });
  }

  var action = String(data.action || "health").trim();

  try {
    if (action === "health") {
      var blobStore = await store.getCapstoneStore();
      return jsonResponse(200, {
        ok: true,
        service: "capstone-settings",
        storage: blobStore ? "netlify-blobs" : "unavailable",
        pin_configured: !!expectedPin()
      });
    }

    var tech = store.normalizeTechnician(data.technician);
    if (!tech && action !== "health") {
      return jsonResponse(400, { ok: false, error: "technician name required" });
    }

    var pinCheck = checkPin(data.pin);
    if (!pinCheck.ok) return jsonResponse(pinCheck.error.indexOf("not configured") >= 0 ? 503 : 403, { ok: false, error: pinCheck.error });

    var storageKey = "settings:" + tech;

    if (action === "push") {
      var payload = sanitizeSettings(data.settings);
      if (!payload.api_key && !payload.plaud.refresh_token) {
        return jsonResponse(400, { ok: false, error: "Nothing to sync — save API key or Plaud token first" });
      }
      await store.writeJson(storageKey, {
        technician: String(data.technician || "").trim(),
        settings: payload
      });
      return jsonResponse(200, {
        ok: true,
        technician: data.technician,
        updated_at: payload.updated_at,
        message: "Settings saved to cloud for " + data.technician
      });
    }

    if (action === "pull") {
      var record = await store.readJson(storageKey);
      if (!record || !record.settings) {
        return jsonResponse(404, { ok: false, error: "No cloud settings for this technician yet" });
      }
      return jsonResponse(200, {
        ok: true,
        technician: record.technician || data.technician,
        settings: record.settings,
        updated_at: record.settings.updated_at || null
      });
    }

    if (action === "delete") {
      await store.deleteKey(storageKey);
      return jsonResponse(200, { ok: true, message: "Cloud settings removed for " + data.technician });
    }

    return jsonResponse(400, { ok: false, error: "Unknown action: " + action });
  } catch (e) {
    return jsonResponse(500, { ok: false, error: e.message || String(e) });
  }
};
