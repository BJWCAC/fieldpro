let storePromise = null;

function getCapstoneStore() {
  if (!storePromise) {
    storePromise = (async function () {
      try {
        var blobs = require("@netlify/blobs");
        return blobs.getStore({ name: "capstone-cloud", consistency: "strong" });
      } catch (e) {
        return null;
      }
    })();
  }
  return storePromise;
}

async function readJson(key) {
  var store = await getCapstoneStore();
  if (!store) return null;
  try {
    return await store.get(key, { type: "json" });
  } catch (e) {
    return null;
  }
}

async function writeJson(key, value) {
  var store = await getCapstoneStore();
  if (!store) throw new Error("Cloud storage is not available on this deployment.");
  await store.setJSON(key, value);
}

async function deleteKey(key) {
  var store = await getCapstoneStore();
  if (!store) return;
  try { await store.delete(key); } catch (e) {}
}

function normalizeTechnician(name) {
  return String(name || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

module.exports = {
  getCapstoneStore: getCapstoneStore,
  readJson: readJson,
  writeJson: writeJson,
  deleteKey: deleteKey,
  normalizeTechnician: normalizeTechnician
};
