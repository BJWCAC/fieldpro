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
