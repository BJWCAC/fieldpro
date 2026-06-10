let storePromise = null;

function getCapstoneStore() {
  if (!storePromise) {
    storePromise = (async function () {
      try {
        const { getStore } = require("@netlify/blobs");
        return getStore({ name: "capstone-cloud", consistency: "strong" });
      } catch (e) {
        return null;
      }
    })();
  }
  return storePromise;
}

async function readJson(key) {
  const store = await getCapstoneStore();
  if (!store) return null;
  try {
    return await store.get(key, { type: "json" });
  } catch (e) {
    return null;
  }
}

async function writeJson(key, value) {
  const store = await getCapstoneStore();
  if (!store) throw new Error("Cloud storage is not available on this deployment.");
  await store.setJSON(key, value);
}

async function deleteKey(key) {
  const store = await getCapstoneStore();
  if (!store) return;
  try { await store.delete(key); } catch (e) {}
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

module.exports = {
  getCapstoneStore,
  readJson,
  writeJson,
  deleteKey,
  normalizeEmail
};
