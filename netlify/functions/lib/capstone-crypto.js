const crypto = require("crypto");

const SALT_BYTES = 16;
const KEY_LEN = 64;

function hashPassword(password) {
  const salt = crypto.randomBytes(SALT_BYTES).toString("hex");
  const hash = crypto.scryptSync(String(password), salt, KEY_LEN).toString("hex");
  return salt + ":" + hash;
}

function verifyPassword(password, stored) {
  if (!stored || stored.indexOf(":") < 0) return false;
  const parts = stored.split(":");
  const salt = parts[0];
  const expected = parts[1];
  const actual = crypto.scryptSync(String(password), salt, KEY_LEN).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(actual, "hex"));
}

function newSessionToken() {
  return crypto.randomBytes(32).toString("hex");
}

function sessionExpiry(days) {
  return new Date(Date.now() + (days || 30) * 24 * 60 * 60 * 1000).toISOString();
}

module.exports = { hashPassword, verifyPassword, newSessionToken, sessionExpiry };
