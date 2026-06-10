const crypto = require("./lib/capstone-crypto");
const store = require("./lib/capstone-store");

const HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

function jsonResponse(status, body) {
  return { statusCode: status, headers: HEADERS, body: JSON.stringify(body) };
}

function inviteCode() {
  return String(process.env.CAPSTONE_INVITE_CODE || "").trim();
}

async function requireSession(event) {
  var data = {};
  try { data = JSON.parse(event.body || "{}"); } catch (e) {}
  var token = (event.headers && (event.headers.authorization || event.headers.Authorization) || "").replace(/^Bearer\s+/i, "") || data.token || "";
  if (!token) return { error: "Missing session token.", status: 401 };
  var session = await store.readJson("session:" + token);
  if (!session || !session.user_id) return { error: "Invalid or expired session.", status: 401 };
  if (session.expires_at && new Date(session.expires_at).getTime() < Date.now()) {
    await store.deleteKey("session:" + token);
    return { error: "Session expired.", status: 401 };
  }
  var user = await store.readJson("user:" + session.user_id);
  if (!user) return { error: "User not found.", status: 401 };
  return { token: token, session: session, user: user, data: data };
}

exports.handler = async function (event) {
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers: HEADERS, body: "" };

  var data = {};
  try { data = JSON.parse(event.body || "{}"); } catch (e) {
    return jsonResponse(400, { ok: false, error: "Invalid JSON body." });
  }

  var action = data.action || "health";

  try {
    if (action === "health") {
      var blobStore = await store.getCapstoneStore();
      return jsonResponse(200, {
        ok: true,
        service: "capstone-api",
        storage: blobStore ? "netlify-blobs" : "unavailable",
        register_enabled: !!inviteCode()
      });
    }

    if (action === "register") {
      var code = inviteCode();
      if (!code) return jsonResponse(503, { ok: false, error: "Registration is not configured. Set CAPSTONE_INVITE_CODE on Netlify." });
      if (String(data.invite_code || "").trim() !== code) return jsonResponse(403, { ok: false, error: "Invalid invite code." });
      var email = store.normalizeEmail(data.email);
      var password = String(data.password || "");
      var name = String(data.display_name || data.name || "").trim();
      if (!email || email.indexOf("@") < 1) return jsonResponse(400, { ok: false, error: "Valid email is required." });
      if (password.length < 8) return jsonResponse(400, { ok: false, error: "Password must be at least 8 characters." });
      if (!name) return jsonResponse(400, { ok: false, error: "Display name is required." });
      if (await store.readJson("email:" + email)) return jsonResponse(409, { ok: false, error: "An account with this email already exists." });

      var userId = "u" + Date.now().toString(36) + crypto.newSessionToken().slice(0, 8);
      var user = {
        id: userId,
        email: email,
        display_name: name,
        password_hash: crypto.hashPassword(password),
        created_at: new Date().toISOString(),
        role: "technician"
      };
      await store.writeJson("user:" + userId, user);
      await store.writeJson("email:" + email, { user_id: userId });

      var token = crypto.newSessionToken();
      await store.writeJson("session:" + token, {
        user_id: userId,
        created_at: new Date().toISOString(),
        expires_at: crypto.sessionExpiry(30)
      });

      return jsonResponse(200, {
        ok: true,
        token: token,
        user: { id: userId, email: email, display_name: name, role: user.role }
      });
    }

    if (action === "login") {
      var loginEmail = store.normalizeEmail(data.email);
      var loginPassword = String(data.password || "");
      var emailRef = await store.readJson("email:" + loginEmail);
      if (!emailRef || !emailRef.user_id) return jsonResponse(401, { ok: false, error: "Invalid email or password." });
      var loginUser = await store.readJson("user:" + emailRef.user_id);
      if (!loginUser || !crypto.verifyPassword(loginPassword, loginUser.password_hash)) {
        return jsonResponse(401, { ok: false, error: "Invalid email or password." });
      }
      var loginToken = crypto.newSessionToken();
      await store.writeJson("session:" + loginToken, {
        user_id: loginUser.id,
        created_at: new Date().toISOString(),
        expires_at: crypto.sessionExpiry(30)
      });
      return jsonResponse(200, {
        ok: true,
        token: loginToken,
        user: {
          id: loginUser.id,
          email: loginUser.email,
          display_name: loginUser.display_name,
          role: loginUser.role || "technician"
        }
      });
    }

    if (action === "logout") {
      var auth = await requireSession(event);
      if (auth.error) return jsonResponse(auth.status, { ok: false, error: auth.error });
      await store.deleteKey("session:" + auth.token);
      return jsonResponse(200, { ok: true });
    }

    if (action === "session") {
      var sess = await requireSession(event);
      if (sess.error) return jsonResponse(sess.status, { ok: false, error: sess.error });
      return jsonResponse(200, {
        ok: true,
        user: {
          id: sess.user.id,
          email: sess.user.email,
          display_name: sess.user.display_name,
          role: sess.user.role || "technician"
        }
      });
    }

    if (action === "sync_push") {
      var pushAuth = await requireSession(event);
      if (pushAuth.error) return jsonResponse(pushAuth.status, { ok: false, error: pushAuth.error });
      var captures = Array.isArray(pushAuth.data.captures) ? pushAuth.data.captures : [];
      var includePhotos = !!pushAuth.data.include_photos;
      var saved = 0;
      for (var i = 0; i < captures.length; i++) {
        var rec = captures[i];
        if (!rec || !rec.id) continue;
        var payload = Object.assign({}, rec, {
          user_id: pushAuth.user.id,
          updated_at: rec.updated_at || rec.localSavedAt || rec.date || new Date().toISOString(),
          synced_at: new Date().toISOString()
        });
        if (!includePhotos && payload.photoData) {
          payload.photoData = payload.photoData.map(function (p) {
            return Object.assign({}, p, { display: "" });
          });
        }
        await store.writeJson("capture:" + pushAuth.user.id + ":" + rec.id, payload);
        saved++;
      }
      return jsonResponse(200, { ok: true, saved: saved });
    }

    if (action === "sync_pull") {
      var pullAuth = await requireSession(event);
      if (pullAuth.error) return jsonResponse(pullAuth.status, { ok: false, error: pullAuth.error });
      var since = pullAuth.data.since || null;
      var sinceMs = since ? new Date(since).getTime() : 0;
      var blobStore = await store.getCapstoneStore();
      if (!blobStore) return jsonResponse(503, { ok: false, error: "Cloud storage unavailable." });

      var list = await blobStore.list({ prefix: "capture:" + pullAuth.user.id + ":" });
      var captures = [];
      for (var li = 0; li < list.blobs.length; li++) {
        var item = await store.readJson(list.blobs[li].key);
        if (!item) continue;
        var updatedMs = new Date(item.updated_at || item.synced_at || item.date || 0).getTime();
        if (!sinceMs || updatedMs >= sinceMs) captures.push(item);
      }
      captures.sort(function (a, b) {
        return new Date(b.updated_at || b.date || 0) - new Date(a.updated_at || a.date || 0);
      });
      return jsonResponse(200, { ok: true, captures: captures.slice(0, 100) });
    }

    return jsonResponse(400, { ok: false, error: "Unknown action: " + action });
  } catch (err) {
    return jsonResponse(500, { ok: false, error: err.message || "Server error." });
  }
};
