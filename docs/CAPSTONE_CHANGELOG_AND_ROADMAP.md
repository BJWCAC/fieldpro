# CapStone Changelog & Roadmap

Living record of what CapStone has shipped, what is planned next, and what we have explicitly decided **not** to do.

**Maintain this file on every meaningful change** — feature PR, bug fix, doc update, field-test finding, or user decision to defer/decline work. Bump the `Last updated` line and add a short entry under the right section. Do not rely on chat history alone.

```text
Last updated: 2026-06-08
Current live version: v272
Test URL: https://BJWCAC.github.io/fieldpro/FieldPro.html?v=272
```

---

## How agents and contributors should use this file

1. **Before starting work** — read *Planned*, *In progress*, and *Declined* so effort is not duplicated.
2. **After shipping** — move the item to *Completed* with version, PR number, and one-line outcome.
3. **When the user defers or declines** — add to *Deferred* or *Declined* with date and reason.
4. **When docs lag the app** — note under *Planned* until the doc PR lands.

Related docs (detail, not status):

- `docs/CAPSTONE_DEVELOPMENT_RULES.md` — how to build and review
- `docs/CAPSTONE_PROGRAM_REVIEW_CHECKLIST.md` — periodic field QA
- `docs/CAPSTONE_FIELD_TEST_LOG.md` — log Android test results
- `docs/PLAUD_INTEGRATION.md` — Plaud Note Pro + Inbox tab design and build phases

---

## Completed

### Reliability & data safety

| Version | PR | What shipped |
|---------|-----|--------------|
| v196 | #83 | Save Capture to local History **before** Zoho/network; Save Locally button; auto-save on visibility change; quota fallback |
| v197 | #84 | Auto-save capture photos to phone Downloads; Save to Phone / Save All; Settings toggle `fp_auto_save_phone_photos` |
| v198 | #85 | Early storage warning; Zoho asset search/deal description enhancements |
| v199 | #87 | History reopen autosave when continuing offline capture |
| v200 | #89 | Technicians from Zoho Internal_Assets.Users (no separate login list) |
| v201 | #90 | Per-field → AI with offline Pending AI queue (Capture, Assets, photos, report generate, asset extract) |
| v202 | #92 | **Inbox tab** — unassigned voice staging, link to deal, summary, Zoho save; Netlify recording pipeline skeleton |
| v203 | #93 | **Inbox deal picker** — active deal bar, Deals-style search modal, Use Active Deal, auto-link when deal selected |
| v204 | #94 | **Inbox button styles** — fix black/unstyled buttons; add `.bb` class; document button classes in dev rules |
| v205 | #95 | **Inbox saved status** — Saved to Zoho chip, banner, and disabled button after successful save; Zoho Pending on queue |
| v206 | #97 | **AssemblyAI Inbox transcription** — upload audio → auto transcript with speaker labels; client poll |
| v207 | #100 | **Plaud Stage 2 auto-pull** — Plaud cloud → Inbox via refresh token; presigned URL → AssemblyAI; auto-pull every 3 min |
| v208 | #101 | **Plaud token refresh fix** — form-encoded refresh for Plaud API; paste whole tokens.json |
| v209 | #102 | **Plaud auto-pull on any tab + foreground** — pull every 3 min app-wide; toast when new recordings arrive |
| v211 | — | **OpenStreetMap link** — View on OpenStreetMap after GPS capture (Capture + Assets) |
| v212 | — | **Accounts Map tab** — Leaflet/OSM map of all Zoho accounts; stored coords + geocode fallback; deal stage pin colors; filters + missing-location panel |
| v213 | — | **Accounts Map polish** — two-phase load, fp_map_cache, marker clustering, fit bounds, deal/Zoho links, lazy Leaflet |
| v214 | — | **Map tab visibility** — move Map next to Deals; tab bar scroll hint for overflow tabs |
| v215 | — | **Zoho refresh resilience** — retry token refresh, clearer errors, cached map when refresh fails offline |
| v216 | — | **Zoho token cache** — reuse access token ~1hr; stop geocode from refreshing OAuth; rate-limit error message |
| v217 | — | **Map: Main Site Coordinates first** — parse `Latitude_Longitude` before Google extension fields or geocoding; bump map cache key |
| v218 | #110 | **Map: active-only initial load** — first open filters to Active accounts and geocodes active only; MN center zoom 6 |
| v219 | — | **Map: more pins when zoomed out** — statewide MN view instead of metro fitBounds; individual pins at zoom 4+; tighter cluster radius |
| v220 | — | **Map: adjustable pin grouping** — Every pin / More pins / Balanced / More groups; choice saved on device |
| v221 | — | **Map: hide legend toggle** — Hide/show deal-stage key on map; preference saved on device |
| v222 | — | **Map: scheduled meetings** — purple diamond pins for upcoming Zoho meetings on Active deals; toggle + legend |
| v223 | — | **Map: overlap spread** — stacked account/meeting pins fan out in a ring as you zoom in for separate taps |
| v224 | — | **Map: hub-and-spoke pins** — deal/account at center, satellites closer on spokes with lines to site |
| v225 | #116 | **Map: all Zoho deal stages + multi-select** — stage chips from CRM; filter one or many stages per account |
| v226 | #117 | **Map: per-deal pins + site spider** — one pin per deal; hub label; deals + meetings on spokes; account-linked meetings |
| v227 | — | **Map: hub label polish** — label hidden until hover/tap; site popup links to each deal + account |
| v228 | — | **Map: zoom disclosure + dense-site panel** — multi-item sites collapse when zoomed out; 5+ items open scrollable list panel instead of spider |
| v229 | — | **Map: fix numbered site pin taps** — site pins outside cluster group, larger tap target, tap opens deal list + zooms in |
| v230 | — | **Map: show deal list on site tap** — list opens immediately under map; expanded site pins never re-cluster; hub tap opens list |
| v231 | — | **Map: always spider multi-item sites** — Lallemand-scale sites (5+ items) now spread pins like Willmar; list panel still opens on tap |
| v232 | — | **Map: Select in CapStone opens Capture** — site list and pin buttons jump to Capture with deal loaded; map deals sync into app if needed |
| v233 | — | **Assets: picklist request (Phase A)** — after AI extract, request new Brand/Type values; email `bradwhite@calibrationsandcontrols.com`; Pending Sync queue; Other + explain unchanged |
| v234 | — | **Assets: picklist near-match** — auto-select on extract when only case/spacing differs; **Use [value]** button when Zoho has a similar Brand/Type |
| v235 | — | **Assets: Account-only save** — save Equipments without a Deal; Pick Account; clearer save button/status; Internal_Assets noted as future |
| v236 | — | **Assets: unified setup** — one Asset setup card with 3 choices (deal / account only / update); search nested under update |
| v237 | #129 | **Assets: pick deal on Assets tab** — **Pick deal & add new** opens deal search modal without switching to Deals tab; Change deal in setup card |
| v238 | #130 | **Assets: Nameplate Additional Info** — AI extract extras go to Zoho `Nameplate_Additional_Info` instead of Description / Instructions |
| v239 | #131 | **Assets: Flow Meter category fields (pilot)** — category-driven sections from config; sensor, display, setup I/O, flow meter details, Subform_1 grid |
| v240 | #132 | **Assets: AI extract part vs model** — prompt distinguishes full part number from short model/series; normalization swaps common mis-assignments |
| v241 | #132 | **Assets: AI extract Zoho series/model mapping** — Series=8750, Model Number=8750WM4AXD1DA2; infer series prefix from full model when needed |
| v242 | #133 | **Assets: Endress+Hauser order number extract** — Order / customer order number on E+H plates maps to Asset Model Number |
| v243 | #134 | **Assets: E+H Promag magmeter extract** — device name→Series, Order Code→Model, K-factor/DN→Flow Meter fields |
| v244 | — | **Assets: magmeter Cal Factor extract** — Cal Factor / Cal. Fact. / K-factor from any magmeter brand → Cal Factor field |
| v245 | #136 | **Assets: photo labels + role-based AI extract** — label transmitter/sensor when photo is taken; main fields vs sensor fields extracted separately |
| v246 | #137 | **Settings: live update URL** — Workflow Help shows current FieldPro.html?v= link from app version |
| v247 | #138 | **Assets: fix sensor AI extract** — preserve sensor values on render; auto Flow Meter category; stronger E+H sensor prompt |
| v248 | #139 | **Assets: sensor label Cal Factor extract** — Cal. Fact. / K-factor from sensor-labeled photos → Cal Factor field |
| v249 | #141 | **Assets: Cal Factor Zoho sync fix** — preserve extracted cal on save; numeric normalization |
| v250 | — | **Assets: Zoho field API name mapping** — Cal_Factor_K_factor_Etc, Model_Number, Serial_Number1, etc. from live CRM metadata |
| v251 | — | **Assets: Open Channel Flow category fields** — OCM flume/weir sections; remove deprecated Flow category from CapStone picker |
| v252 | — | **Assets: Open Channel Flow layout trim** — Rosemount Details section removed from Open Channel Flow category |
| v253 | — | **Assets: Ultra 4 part-number series rule (initial)** — P/N prefix 1744111 → Ultra 4 |
| v254 | — | **Assets: Ultra 4 prefix fix (Pulsar)** — correct prefix 174111 (e.g. 1741110002XX-XXP); also Brand Pulsar + Type Ultrasonic Flow |
| v255 | — | **Assets: Set Up Input/Output polish** — Engineering Units lookup dropdowns from Zoho CustomModule8; PV @ Zero/Span as numeric fields |
| v256 | — | **Assets: search without account required** — CAC ID / customer asset # search all accounts; load sets account from Zoho record |
| v257 | — | **Assets: AMD/CAC asset search fix** — Name contains + COQL fallback; account bypass when query matches name/CAC/customer #; **Global button processing feedback** — header Processing badge, pressed + spinner states on all buttons |
| v258 | — | **Assets: AMD search actually works** — fix Zoho 50-field limit breaking all searches; use word search + equals/starts_with (contains is invalid in Zoho); AMD searches ignore account filter |
| v259 | — | **Assets: fix Input/Output Set ups Add row** — new subform rows no longer wiped on re-render; empty rows kept while editing |
| v260 | — | **Assets: subform Engineering Unit lookup dropdown** — Input/Output Set ups uses Zoho CustomModule8 like Set Up Input/Output; **Add vs Update workflow gate** — choose intent first, form shows only when ready |
| v261 | — | **Assets: category layout activation on save** — phased Zoho save activates Asset Category layout rules (category touch + category fields after create); CapStone reload syncs category sections when loading assets |
| v262 | — | **Assets: save typo fix** — `finalizeDynamicValuesBeforeSave` (was broken reference blocking all asset saves) |
| v263 | — | **Assets: Zoho category layout fix** — clear-then-set Asset_Category with v8 `layout_rules`; create/update core without category first; CapStone always loads equipment config before rendering category fields |
| v264 | — | **Assets: category fields + UX polish** — category select waits for config before showing sections; Account only opens account picker (one button); Extract AI below photos; picklist Use works on first tap; Input PV Zero/Span mirrors to Output |
| v265 | — | **Global button busy + scroll + autofill** — `wrapAction` on all CapStone actions; tabs/deal cards show pressed/spinner; scroll restored after DOM updates; block username/password autofill on fields; Display Engineering Units defaults GPM US (full picklist); Input defaults In H2O; Output defaults 4-20 mA |
| v266 | — | **Open Channel Flow EU defaults** — Set Up Input defaults Inches H2O; Set Up Output defaults 4-20 mA (Open Channel Flow only) |
| v267 | — | **Zoho category layout confirm pass** — swap via temporary category (OCF↔Flow Meter), double activate + re-save category fields so Open Channel Flow layout applies without manual Zoho reselect |
| v268 | — | **Zoho OCF layout persist fix** — always clear category before temp swap; apply layout_rules on temp category; final save includes Asset_Category + category fields together (matches Zoho reselect-then-save) |
| v269 | — | **Asset category layout rule (all categories)** — document required Zoho save sequence in `CAPSTONE_DEVELOPMENT_RULES.md`; field-test checklist; config note that new categories use shared layout activation path |
| v270 | — | **Zoho category layout server fix** — Netlify `activate_equipment_category_layout` runs temp swap + double v8 layout_rules + persist in one server request; core save strips category extension fields; requires Netlify deploy |
| v271 | — | **Asset UX fixes** — category fields show immediately on select (loading state + scroll into view); account picker search no longer triggers login autofill; Other photo labels preserved; per-role photo limits (3 transmitter, 3 sensor, 6 other) and unique upload filenames |
| v272 | — | **Zoho OCF layout reopen confirm** — two-pass category activation: initial temp swap/reselect + extension save, then reopen confirm pass (read record, reselect category, v8+v3 resave); normalize Asset Category key for CapStone layout rendering |

### UI / workflow polish

| Version | PR | What shipped |
|---------|-----|--------------|
| v193 | #80 | Capture mode status line; standardized save/retry labels; History polish; capture photo pending sync; Zoho timeouts; offline messaging |
| v194 | #81 | Collapsible help boxes on all tabs; nested Capture/Assets help; persisted open state |
| v195 | #82 | Fix Android photo label/description losing focus (no full re-render on keystroke) |
| v192 | #79 | Restore modular `FieldPro.html` after accidental v121 monolith re-upload |
| v192 | #78 | Capture draft restore shows details before confirm |
| — | #77 | Asset draft restore shows details before confirm |
| — | #76 | History card action grouping |
| — | #75 | Retry action for failed capture photo uploads |
| — | #74 | Per-photo sync status on Capture |
| — | #73 | Replacement history shown as in-app cards |
| — | #72 | Settings reorganized into grouped sections |
| — | #71 | History card status chips (Zoho, PDF, pending sync, technician) |
| — | #70 | Program review checklist doc added |
| — | #69 | Asset draft autosave and restore |
| — | #68 | Asset save checklist |
| — | #67 | Standardized pending sync / retry wording |
| — | #66 | Deal Selection Workflow card |
| — | #65 | Renamed Pending Uploads → Pending Sync |
| — | #64 | Capture photo labels |

### Zoho / Assets

| Version | PR | What shipped |
|---------|-----|--------------|
| v198 | #85 | Asset search: brand, type, series; `contains` fallback; richer Deal `Instrument_Description`; refresh description when asset already linked; technician in replacement blocks |
| v233 | — | Picklist request email for AI-detected Brand/Type not in Zoho (Phase A); dedupe hint for near matches |
| Earlier | — | Equipment create/update, deal asset link, equipment + deal update notes, asset search, replace-instrument workflow, replacement notes in `Description_Instructions`, replacement cards in Asset History panel |

### Docs & process

| Date | What shipped |
|------|--------------|
| 2026-06-08 | `CAPSTONE_CHANGELOG_AND_ROADMAP.md` — living status doc |
| 2026-06-08 | `PLAUD_INTEGRATION.md` — Plaud Note Pro division of labor, Inbox tab, Fork A/B sequencing |
| 2026-06-08 | `PLAUD_STAGE2_SETUP.md` — Plaud refresh token + auto-pull field setup |

### Structure (earlier milestone)

| Version | What shipped |
|---------|--------------|
| v182 era | CSS/JS split from monolith; Deals, Capture, Assets, Report, History, Settings tabs; AI report; Zoho notes + PDF; WorkDrive; local History; technician selection; GPS; equipment asset workflow |

---

## In progress

| Item | Status | Notes |
|------|--------|-------|
| **Fix bugs from field test** | As needed | Small PRs if field testing surfaces issues |

---

## Planned (accepted — do next)

| Priority | Item | Notes |
|----------|------|-------|
| Medium | **Asset category field rollout** | Open Channel Flow shipped v251; Set Up I/O lookup dropdowns v255; next: Gas Detector, Analytical, Lift Station, Scales & Balances |
| Medium | **Cloud sync Phase 1 (revised)** | Key sync by Zoho technician name |
| On hold → **ready** | **Training video** | Track A + Inbox + Stage 0 complete — can schedule when desired |
| Low | **Optional Capture photo parity** | Only if field testing requests |

---

## Deferred (maybe later — not committed)

| Item | Why deferred |
|------|----------------|
| **Plaud Fork B — diary / RAG** | Ambient search, embeddings, pgvector, nightly digest — after Fork A Inbox is routine |
| Separate CapStone email/password accounts | Declined — use Zoho Users picklist for technician identity |
| Phase 2+ cloud photo storage, native app | See backend architecture when revised |
| Further `src/app.js` modularization | Not blocking field use |

---

## Declined (will not do)

| Item | Decision date | Reason |
|------|---------------|--------|
| **Dedicated Zoho replacement subform or separate replacement history module** | 2026-06-08 | User: replacing the existing asset and making a note is good enough. |
| **Separate CapStone technician list / email login** | 2026-06-08 | User: use Zoho CRM Internal_Assets.Users picklist for technicians instead. |

---

## Housekeeping

| Item | Action |
|------|--------|
| **PR #8** — old docs PR | **Close** — superseded |
| **PR #88** — separate cloud login | **Close** — superseded by Zoho Users technician approach |
| **Note Pro hardware** | **Order when ready** — first-day checklist in `PLAUD_INTEGRATION.md` |

---

## Open questions / waiting on user

| Item | Notes |
|------|-------|
| **Resend API key for picklist request emails** | Add `RESEND_API_KEY` on Netlify; optional `PICKLIST_REQUEST_FROM` (verified domain). Default to: `bradwhite@calibrationsandcontrols.com`. Until set, requests queue in Pending Sync. |
| Field test results | Fill in `docs/CAPSTONE_FIELD_TEST_LOG.md` after device testing |
| Plaud Stage 0 validation | Done — Claude MCP + CapStone Inbox → Zoho |
| AssemblyAI API key on Netlify | User action — see `docs/ASSEMBLYAI_SETUP.md` |

---

## Version index (quick reference)

| Version | Theme |
|---------|--------|
| v192 | Modular shell restored; draft restore details |
| v193 | UI/workflow consistency + sync reliability |
| v194 | Collapsible help |
| v195 | Photo input focus fix |
| v196 | Local History save before Zoho |
| v197 | Phone Downloads photo backup |
| v198 | Storage warning + Zoho search/deal description enhancements |
| v199 | History reopen autosave when continuing offline |
| v200 | Technicians loaded from Zoho Internal_Assets.Users |
| v201 | Per-field → AI with offline Pending AI queue |
| v202 | Inbox tab — Plaud Fork A Stage 1 (unassigned voice staging) |
| v207 | Plaud Stage 2 — cloud auto-pull into Inbox |
| v233 | Assets picklist request email (Brand/Type Phase A) |
| v234 | Picklist near-match Use button + auto-select on strong match |
