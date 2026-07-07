# AGENTS.md

## Cursor Cloud specific instructions

CapStone is a **static, dependency-free web app** plus optional Netlify serverless functions. There is no `package.json`, no build step, and no `node_modules` — Node.js (for `node --check`) and Python 3 are pre-installed, so the update script intentionally does nothing meaningful.

### Architecture
- Frontend entry point: `FieldPro.html` (root). It loads `src/styles.css`, `src/accounts-map.js`, and `src/app.js` (~425 KB, the bulk of the app) via **relative** paths, so it must be served from the repository root, not a subdirectory.
- Frontend uses CDN for jsPDF + Google Fonts (needs internet).
- Backend: `netlify/functions/*.js` are Zoho CRM / WorkDrive / AssemblyAI / Plaud proxies. They use only Node built-ins (`https`), so there are still no installable deps.

### Run (development)
- Serve the static app from the repo root, e.g. `python3 -m http.server 8000`, then open `http://localhost:8000/FieldPro.html`.
- The Netlify functions require secrets (Zoho OAuth, AssemblyAI, Plaud) and live external services; they cannot run end-to-end here without those. To exercise them locally you would need `netlify-cli` + those secrets — not installed by default.

### What works without secrets
All local-first features work offline: technician prompt (dismiss with **Later**, dropdown is empty without Zoho), Capture notes, "Save Locally to History", and the History tab (data persists in `localStorage`). Deals refresh, AI report generation, and Zoho/WorkDrive saves all require the backend + secrets and will fail/queue in Pending Sync without them.

### Lint / test
There is no test framework. Per `docs/CAPSTONE_DEVELOPMENT_RULES.md`, the standard checks are:
- `node --check src/app.js`
- `node --check netlify/functions/zoho-proxy.js` (and the other function files)
- `git diff --check`

### Versioning gotcha
Script/style URLs are cache-busted with `?v=NNN` query strings in `FieldPro.html` (e.g. `src/app.js?v=307`). When editing app behavior, bump `FP_VERSION` and the matching cache-bust query strings (see the Version and cache rules in `docs/CAPSTONE_DEVELOPMENT_RULES.md`).

### Testing `localStorage`/storage-driven UI
State that drives the UI (History, cached deals, drafts, sync queues) lives in `localStorage` under `fp_*` keys, with photo/PDF bytes offloaded to IndexedDB. To test storage-dependent behavior (e.g. the Capture "Storage getting full" banner) without the backend, seed `localStorage` from the DevTools Console and reload. Key names include `fp_history`, `fp_deals`, `fp_pending_uploads`, `fp_pending_ai`, `fp_inbox`, `fp_capture_draft`, `fp_asset_draft`. Example to reproduce a full-storage warning driven by cached deals rather than History:

```js
localStorage.removeItem('fp_history');
var arr=[]; for(var i=0;i<6000;i++){arr.push({id:'d'+i,Deal_Name:'Deal '+i+' '+'x'.repeat(400),Account_Name:'Account '+i,Description:'y'.repeat(200)});}
localStorage.setItem('fp_deals', JSON.stringify(arr)); // ~8 MB; must be valid JSON or boot discards it
location.reload();
```

The storage banner's threshold is `CAPTURE_STORAGE_WARN_MB` and totals come from `getStorageSize()` (UTF-16, so reported MB ≈ 2× the raw character count).
