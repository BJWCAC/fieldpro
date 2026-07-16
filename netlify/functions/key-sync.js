// CapStone Cloud Key Sync (Phase 1)
// Stores a technician's CapStone keys/settings in the cloud, keyed by their
// Zoho technician name and protected by a passphrase the technician chooses.
//
// Storage: Netlify Blobs in production. Falls back to a local filesystem store
// (KEY_SYNC_DIR or the OS temp dir) when Blobs is unavailable, so the function
// can be exercised locally without Netlify context.
//
// Security model (Phase 1):
// - The record is keyed by the normalized technician name.
// - Settings are encrypted at rest with AES-256-GCM using a key derived from
//   the passphrase (scrypt). Without the passphrase the stored blob cannot be
//   decrypted, and a pull with the wrong passphrase fails the GCM auth check.

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const os = require("os");

var STORE_NAME = "capstone-key-sync";
var SCRYPT_KEYLEN = 32;
var SCRYPT_COST = { N: 16384, r: 8, p: 1 };

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json"
  };
}

function json(statusCode, obj) {
  return { statusCode: statusCode, headers: corsHeaders(), body: JSON.stringify(obj) };
}

function normalizeTechnician(name) {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function technicianKey(name) {
  var norm = normalizeTechnician(name);
  return crypto.createHash("sha256").update("capstone:" + norm).digest("hex");
}

function deriveKey(passphrase, salt) {
  return crypto.scryptSync(String(passphrase), salt, SCRYPT_KEYLEN, SCRYPT_COST);
}

function encryptSettings(passphrase, settingsObj) {
  var salt = crypto.randomBytes(16);
  var iv = crypto.randomBytes(12);
  var key = deriveKey(passphrase, salt);
  var cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  var plaintext = Buffer.from(JSON.stringify(settingsObj), "utf8");
  var enc = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  var tag = cipher.getAuthTag();
  return {
    salt: salt.toString("base64"),
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    data: enc.toString("base64")
  };
}

function decryptSettings(passphrase, record) {
  var salt = Buffer.from(record.salt, "base64");
  var iv = Buffer.from(record.iv, "base64");
  var tag = Buffer.from(record.tag, "base64");
  var data = Buffer.from(record.data, "base64");
  var key = deriveKey(passphrase, salt);
  var decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  var dec = Buffer.concat([decipher.update(data), decipher.final()]);
  return JSON.parse(dec.toString("utf8"));
}

// ---- Storage layer (Netlify Blobs with filesystem fallback) ----

var blobsLib = null;
try {
  blobsLib = require("@netlify/blobs");
} catch (e) {
  // package not available locally — fall back to filesystem
  blobsLib = null;
}

// Lambda compatibility mode (exports.handler) does not auto-configure Netlify
// Blobs. connectLambda(event) must run before getStore(), or getStore throws
// MissingBlobsEnvironmentError. Call this at the top of the handler.
function connectBlobs(event) {
  if (blobsLib && typeof blobsLib.connectLambda === "function") {
    try {
      blobsLib.connectLambda(event);
    } catch (e) {}
  }
}

function getBlobStore() {
  if (blobsLib && typeof blobsLib.getStore === "function") {
    try {
      return blobsLib.getStore(STORE_NAME);
    } catch (e) {
      // Blobs not configured in this environment — fall back to filesystem
    }
  }
  return null;
}

function fsStoreDir() {
  var dir = process.env.KEY_SYNC_DIR || path.join(os.tmpdir(), STORE_NAME);
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch (e) {}
  return dir;
}

async function storeGet(key) {
  var store = getBlobStore();
  if (store) {
    var raw = await store.get(key, { type: "text" });
    return raw ? JSON.parse(raw) : null;
  }
  var file = path.join(fsStoreDir(), key + ".json");
  try {
    var txt = fs.readFileSync(file, "utf8");
    return txt ? JSON.parse(txt) : null;
  } catch (e) {
    return null;
  }
}

async function storeSet(key, value) {
  var store = getBlobStore();
  var serialized = JSON.stringify(value);
  if (store) {
    await store.set(key, serialized);
    return;
  }
  var file = path.join(fsStoreDir(), key + ".json");
  fs.writeFileSync(file, serialized, "utf8");
}

// ---- Request handling ----

async function handlePush(data) {
  var technician = String(data.technician || "").trim();
  var passphrase = String(data.passphrase || "");
  var settings = data.settings;
  if (!technician) return json(400, { ok: false, error: "technician is required" });
  if (passphrase.length < 4) return json(400, { ok: false, error: "passphrase must be at least 4 characters" });
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) {
    return json(400, { ok: false, error: "settings object is required" });
  }
  var enc = encryptSettings(passphrase, settings);
  var record = {
    v: 1,
    technician: technician,
    salt: enc.salt,
    iv: enc.iv,
    tag: enc.tag,
    data: enc.data,
    fields: Object.keys(settings),
    device: String(data.device || "").slice(0, 120),
    updatedAt: new Date().toISOString()
  };
  await storeSet(technicianKey(technician), record);
  return json(200, { ok: true, updatedAt: record.updatedAt, fields: record.fields.length });
}

async function handlePull(data) {
  var technician = String(data.technician || "").trim();
  var passphrase = String(data.passphrase || "");
  if (!technician) return json(400, { ok: false, error: "technician is required" });
  if (!passphrase) return json(400, { ok: false, error: "passphrase is required" });
  var record = await storeGet(technicianKey(technician));
  if (!record) return json(200, { ok: true, found: false });
  var settings;
  try {
    settings = decryptSettings(passphrase, record);
  } catch (e) {
    return json(403, { ok: false, error: "Wrong passphrase for " + technician });
  }
  return json(200, {
    ok: true,
    found: true,
    settings: settings,
    updatedAt: record.updatedAt || null,
    device: record.device || ""
  });
}

// ---- Org role policy (Phase 2) ----
// One org-wide policy document (which tabs/settings/capabilities a user role gets,
// the shared admin PIN hash, and the default role). Writes require a publish
// passphrase (hash stored server-side); reads are open so every device can pull
// and apply the policy at startup. The policy is not secret (it only describes UI
// access); the passphrase protects it from tampering.
function orgPolicyKey() {
  return crypto.createHash("sha256").update("capstone:policy:v1").digest("hex");
}
function hashPassphrase(passphrase, salt) {
  return crypto.scryptSync(String(passphrase), salt, SCRYPT_KEYLEN, SCRYPT_COST).toString("base64");
}
async function handlePolicyPush(data) {
  var passphrase = String(data.passphrase || "");
  var policy = data.policy;
  if (passphrase.length < 6) return json(400, { ok: false, error: "publish passphrase must be at least 6 characters" });
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    return json(400, { ok: false, error: "policy object is required" });
  }
  var key = orgPolicyKey();
  var existing = await storeGet(key);
  var saltB64, passHash;
  if (existing && existing.pass_salt && existing.pass_hash) {
    var salt = Buffer.from(existing.pass_salt, "base64");
    var attempt = hashPassphrase(passphrase, salt);
    var match = false;
    try { match = crypto.timingSafeEqual(Buffer.from(attempt, "base64"), Buffer.from(existing.pass_hash, "base64")); } catch (e) { match = false; }
    if (!match) return json(403, { ok: false, error: "Wrong publish passphrase" });
    saltB64 = existing.pass_salt;
    passHash = existing.pass_hash;
  } else {
    var newSalt = crypto.randomBytes(16);
    saltB64 = newSalt.toString("base64");
    passHash = hashPassphrase(passphrase, newSalt);
  }
  var record = {
    v: 1,
    policy: policy,
    pass_salt: saltB64,
    pass_hash: passHash,
    device: String(data.device || "").slice(0, 120),
    updatedAt: new Date().toISOString()
  };
  await storeSet(key, record);
  return json(200, { ok: true, updatedAt: record.updatedAt });
}
async function handlePolicyPull() {
  var rec = await storeGet(orgPolicyKey());
  if (!rec) return json(200, { ok: true, found: false });
  return json(200, { ok: true, found: true, policy: rec.policy || null, updatedAt: rec.updatedAt || null, device: rec.device || "" });
}

async function handleStatus(data) {
  var technician = String(data.technician || "").trim();
  if (!technician) return json(400, { ok: false, error: "technician is required" });
  var record = await storeGet(technicianKey(technician));
  if (!record) return json(200, { ok: true, found: false });
  return json(200, {
    ok: true,
    found: true,
    updatedAt: record.updatedAt || null,
    device: record.device || "",
    fields: Array.isArray(record.fields) ? record.fields.length : null
  });
}

exports.handler = async function (event) {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: corsHeaders(), body: "" };
  }
  if (event.httpMethod !== "POST") {
    return json(405, { ok: false, error: "POST only" });
  }
  connectBlobs(event);
  var data;
  try {
    data = JSON.parse(event.body || "{}");
  } catch (e) {
    return json(400, { ok: false, error: "Invalid JSON body" });
  }
  var action = String(data.action || "").toLowerCase();
  try {
    if (action === "push") return await handlePush(data);
    if (action === "pull") return await handlePull(data);
    if (action === "status") return await handleStatus(data);
    if (action === "policy_push") return await handlePolicyPush(data);
    if (action === "policy_pull") return await handlePolicyPull(data);
    return json(400, { ok: false, error: "Unknown action: " + action });
  } catch (err) {
    return json(500, { ok: false, error: err.message || String(err) });
  }
};

// Exposed for local testing harnesses.
exports._internal = {
  normalizeTechnician: normalizeTechnician,
  technicianKey: technicianKey,
  encryptSettings: encryptSettings,
  decryptSettings: decryptSettings
};
