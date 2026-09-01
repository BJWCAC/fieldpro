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

As of v357, Netlify `zoho-proxy` also requires `CAPSTONE_APP_SECRET` (must match `PROXY_APP_SECRET` in `src/app.js` or device `fp_proxy_secret`). Zoho access tokens never leave the proxy.

### Customer copy content rule
Reports are issued as named copies (**Customer Copy** / **Internal Copy** / **Other**, chosen on Capture and Report). A **Customer Copy never contains equipment part numbers, model numbers, order numbers/order codes, serial numbers, or pricing** (a model number counts as a part number; Endress+Hauser prints it as an order code, while work/purchase order numbers stay) — not in the report body, the deal name in the header, the technician's photo description, or the AI Synthesis; internal and other copies keep everything. Filtering happens at render time (`isCustomerCopyLabel()` + `redactCustomerCopyText()` in `buildPDF()` and `buildReportExportText()`), never by dropping captured data. A code is withheld whether or not it was labeled: a labeled value can carry a brand in front of it (`Model: Honeywell DR4500A`), an unlabeled code is caught by shape in either case (`Replaced the Honeywell DR4500A chart recorder`, `replaced the dr4500a pen arm`), and as of v391 a model number that is only a plain number (`Rosemount 3051`, `Promag 400`, `Fisher 667`) is caught by the equipment noun standing beside it, since `3051` and `1350 GPM` are the same shape. A number withheld once is withheld everywhere in the copy, so a repeat mention with nothing beside it to identify it goes too, and a model wearing the shape of a plant tag (`Hach SC200`) is withheld when a brand wrote it. A brand in front of a number in the report body also counts as evidence that the same number in the deal name is a model rather than the job number (`CAC-4641 Rosemount 3051 transmitter calibration` renders as `CAC-4641 Rosemount transmitter calibration`), while the site's own name is never a brand. Readings, units, dates, chemistry, material grades, standards/ratings, job references, plant references (`Basin 12`, `Room 101`, `Manhole 12`), the shop's own test equipment (`Fluke 754`), and plant loop/panel tags (`FIT-101`, `LCP-3`) must survive it — including the deal's own job number, which is part of the deal name (`CAC-4641 DR4500A chart recorder calibration` renders as `CAC-4641 chart recorder calibration`). As of v388 the copy carries **no placeholder** where a value was: the value, its label, and the punctuation holding it are removed together and `closeCustomerCopyGaps()` closes the hole, so the copy reads as a finished report and never says "not shown on customer copy". v389 removed the last two words about it — the note under the copy name in the PDF and the matching line in the shared text — and drops a section heading whose every line was dropped, so no blank section is left standing either. As of v390 the same is true of wording the AI or a technician wrote themselves: `redactCustomerCopyPlaceholders()` removes `Serial: [redacted]`, `part number withheld on customer copy`, `Model: N/A`, and `Part number: ***` whole, while ordinary field wording survives (`pen arm removed and replaced`, `the step was omitted`, `Amount removed: 5 gallons`) — `redacted`/`withheld`/`not shown`/`confidential` go anywhere, the ordinary words only inside brackets or in a labeled value slot. Also as of v390 a customer copy prints **one AI block per photo, the AI Synthesis**; the AI Observation is left off (the synthesis already merges it with the technician's note), which `customerSafePhotos()` does by blanking `aiDesc` so every render path drops it. The technician still sees what went — the Report tab lists it. As of v392 a brand standing in front of a plain number also withholds it when the line names equipment anywhere on it, which is how a parts line writes an identifier (`- Sensor o-ring set, PTFE, Rosemount 3051, qty 2`), and a function word on both sides of a closed hole takes the preposition the value hung from (`ask for the 3051 with a coplanar flange` must not close as `for with a coplanar flange`). As of v395 an unlabeled 6+ digit number in the service-report body is a part or serial (`Installed replacement 307575`, `Honeywell 51404671 pen arm`, `Recorder 12345678`) unless it is a reading (`1284567 gallons`, `The meter read 1284567`); `Replacement`/`Spare` also count as labels, and a series-letter model (`Promag P 300`) goes the same way. Any new AI or free-text field that reaches a report must be routed through the filter in the same PR, and every change to the filter must run `node tests/customer-copy-redaction.js`. Full rules in `docs/CAPSTONE_DEVELOPMENT_RULES.md` under "Customer copy content rule".

### Calibration domain rules
`docs/CALIBRATION_SPEC_RULES.md` is the shared source of truth for how the `Model_AI_Specs` field (on the `Equipments` module) should be written — accuracy-basis table, family-specific traps, metal-detector paradigm, sensor-model gap, output format. It applies equally to Claude/Cursor doing this by hand and to CapStone's own automatic generation (`MODEL_AI_SPECS_SYSTEM_PROMPT` used by `generateModelAiSpecsIfNeeded()` on new asset save — Gemini is the primary source, Claude a fallback, no merge). If you change the rules, update both places.

### Parts lookup domain rules
`docs/PARTS_LOOKUP_RULES.md` is the same arrangement for **parts needed for a recorded deficiency** — the JSON output contract, what a deficiency usually needs by instrument family, and the traps worth a note (the calibration living in the part on a Siemens SENSORPROM or E+H S-DAT, kits that supersede pieces, dated stock, option-dependent numbers, parts that are not field-replaceable). It governs CapStone's own **Parts for Recorded Deficiencies** on Capture (`PARTS_LOOKUP_SYSTEM_PROMPT` used by `runPartsLookup()` — Gemini primary, Claude fallback, both web-search grounded, no merge) as well as anyone doing it by hand. If you change the rules, update both places. As of v394 the lookup reads the **entire capture** — every section, every photo as an image (so it can read the nameplate and see what was designated bad), photo notes / AI observation / synthesis, voice, and the video transcript — then searches the live web. It does not look in History or a shop parts database. Three constraints are load-bearing: every part must be tied to a deficiency this visit recorded or showed (no designated-bad part, no lookup), it never writes a price, and a part number the search did not find arrives **empty** rather than as wording that announces its absence. Checked parts are written into capture section `sec10` (**10. Parts Needed / Recommended**) by `partsLookupLine()`, which is the only path into the report, the PDF, and the deal note — nothing is ordered and nothing is written to Zoho from the panel.

### Lint / test
There is no test framework. Per `docs/CAPSTONE_DEVELOPMENT_RULES.md`, the standard checks are:
- `node --check src/app.js`
- `node --check netlify/functions/zoho-proxy.js` (and the other function files)
- `node tests/customer-copy-redaction.js` (plain Node script, no deps; required for any change to the customer copy filter)
- `node tests/parts-lookup.js` (plain Node script; required for any change to the parts lookup assembly or Gemini image conversion)
- `node tests/day-night-buttons.js` (plain Node script; required for any change to `.bg` / `.bw` surface classes or day/night button styling)
- `node tests/pdf-layout.js` (plain Node script; required for any change to `buildPDF()` pagination or first-page layout)
- `node tests/copy-capture-to-deals.js` (plain Node script; required for any change to copy-visit-to-other-deals or History blob refcounting)
- `node tests/wo-tab.js` (plain Node script; required for any change to WO Host matching, Meeting Status filtering, or start-of-day sort)
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
