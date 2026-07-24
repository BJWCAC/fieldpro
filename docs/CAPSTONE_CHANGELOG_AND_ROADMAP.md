# CapStone Changelog & Roadmap

Living record of what CapStone has shipped, what is planned next, and what we have explicitly decided **not** to do.

**Maintain this file on every meaningful change** — feature PR, bug fix, doc update, field-test finding, or user decision to defer/decline work. Bump the `Last updated` line and add a short entry under the right section. Do not rely on chat history alone.

```text
Last updated: 2026-07-24
Current live version: v365
Test URL: https://BJWCAC.github.io/fieldpro/FieldPro.html?v=365
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
| v365 | — | **PV Parameter fields only for Flow Open Channel** — Input PV Zero/Span Parameter and Output PV Zero/Span Parameter are layout-visible and saved only when Asset Category is Flow Open Channel. Removed from Flow Meter and General Set Up Input/Output (numeric PV @ Zero/Span remain). Pulsar Ultra 4 P005/P006/P838/P839 suggested defaults apply to Flow Open Channel only. |
| v364 | — | **Stop endless retries on Netlify-config pending sync errors** — a queued picklist request (or any pending sync item) failing with a server configuration error (e.g. `RESEND_API_KEY is not configured on Netlify`) retried forever — one field item hit 245 attempts — because retrying from the device can never fix a missing Netlify environment variable. Such items are now flagged `configBlocked`: auto-retry (startup / online / visibility / 2-min interval) skips them, while a manual **Retry Sync** still re-attempts them so the queue drains once the admin adds the env var. The Pending Sync card explains the situation ("Blocked by a Netlify setup issue… an admin must add the missing Netlify environment variable, then tap Retry Sync") instead of the generic "tap Discard" hint, and picklist-request errors now show the server's error message instead of raw JSON. Fix for the reported item itself: add `RESEND_API_KEY` under Netlify Site settings → Environment variables, then tap Retry Sync. |
| v363 | — | **Stop browsers offering "Use name and password" on asset fields** — some asset inputs (Asset Name in particular) were being recognized as username/password login fields, so mobile browsers offered saved credentials. Two causes fixed: (1) `initNoAutofill()` generated `name="fp-name"` for `asset-name` — "name"/"user"/"pass"/"login"/"email" tokens are exactly what browser credential heuristics match on and they ignore `autocomplete="off"` for such fields; a new `sanitizeNoAutofillName()` strips those tokens from every generated name (`fp-name` → `fp-nm`). (2) All fields lived outside any `<form>`, so the browser grouped the whole page — including the five hidden `type="password"` inputs (admin PIN, policy/sync passphrases, Anthropic/Gemini API keys) — into one synthetic form, pairing Asset Name with a password field; each password input now sits in its own `<form autocomplete="off">` wrapper. Also stopped `initNoAutofill()` overwriting the deliberate `autocomplete="new-password"` on password inputs with the ignored `"off"`. |
| v362 | — | **Asset extraction fills more fields + 6 photos per label type + easier label switching** — (1) Nameplate extraction now also captures tag/customer asset number, process range (→ Input PV @ Zero/Span + Input Engineering Units), gas type (→ Gas Sensor Type/s), scale class, and display resolution (d=), and maps them into the category fields instead of only dumping them into Nameplate Additional Info; printed units are normalized to Zoho picklist values (GPM→GPM US, °F→Degrees F, inWC→In H2O, …); output signal and pipe size also fall back to the ratings/visible-text blocks; when no Asset Category is picked yet, a clearly gas/scale/flow nameplate auto-selects the category (toast, changeable). Values that can't land in a field still go to Additional Info. (2) Photo label limits raised from 3/3/6 to **6 transmitter, 6 sensor, 6 other**, and extraction now sends up to 5 photos per type to the AI. (3) The Label This Photo dialog is easier to use: each type button shows a live count (e.g. `2/6`) and greys out when full, tapping a full type explains why, a full default type auto-selects one with room, **Use Default** never dead-ends on a full type, and Use Label is blocked while the selected type is full. |
| v361 | — | **AI prefill confirmation banner moved above the Save button** — the "N AI-prefilled fields need review / Confirm prefilled fields" banner (`#asset-prefill-banner`) used to sit near the top of the asset form (under the photo/extract buttons), so after reviewing the long form the technician had to scroll back up to confirm before saving. It now renders between Deal Asset Notes and **Save Asset to Zoho**, right where the blocked save happens. |
| v360 | — | **Asset save status moved below the Save button** — the `#asset-status` box (save results, "Cannot save yet: …" validation messages) used to sit at the very top of the Add Asset card, so after tapping Save on the long form the technician had to scroll back up to see what happened. It now renders directly under **Save Asset to Zoho / Start New Asset**. While the entry form is hidden (setup/search phase) `assetStatus()` moves the box back to the top of the card so search/load messages stay visible. |
| v359 | — | **Don't require an account pick when updating a loaded asset** — drafts saved under v357 stored the loaded asset's account with a blanked ID (side effect of the v357 regex regression), and Update Existing mode has no "Account only — pick account" button, so those restored drafts were stuck on "Zoho Account … required" even after v358. Since the update payload already omits `Account` when no valid ID is on hand (Zoho keeps the record's existing account lookup), `validateAssetForm()` now skips the account/deal requirement whenever an existing asset is loaded (`currentAssetId` set); the save checklist shows "Update keeps the asset's existing Zoho account." instead of a red item. |
| v358 | — | **Fix asset save/update "Zoho Account … required" regression (v357)** — the v357 lock-down accidentally changed the Zoho record-ID checks in `isZohoLookupRecordId()` and `resolveEngineeringUnitLookupId()` from "10 or more digits" to "exactly 10 digits". Real Zoho CRM record IDs are 18–19 digits, so every account/equipment ID failed validation: updating a loaded asset (e.g. AMD1073) toasted "Zoho Account (tap Account only — pick account) required", new-asset saves failed the Account check, and loading a record could throw "invalid equipment record ID". Restored the `10,` quantifier in both regexes. |
| v357 | #246 | **Zoho proxy lock-down** — require `CAPSTONE_APP_SECRET` on every `zoho-proxy` call; restrict CORS to CapStone origins; keep Zoho OAuth access tokens server-side only (browser never receives/stores them). Client uses `ensure_auth` + `zohoProxyFetch`; Settings can override secret via `fp_proxy_secret`. Proxy build **287**. |
| v356 | — | **Fix pending sync items that never clear** — pending uploads whose photo/PDF bytes were offloaded to IndexedDB and later evicted could never re-upload ("missing data"), so they retried forever and stayed in the queue. Retry now detects these unrecoverable items and drops them (with a one-time toast), and every pending item gets a per-item **Discard** button (ungated, so a restricted user can clear a stuck item) plus a "not syncing after N tries" hint. Tapping **Retry Sync** now clears such items automatically. |
| v355 | — | **Background Model_AI_Specs research** — asset saves no longer wait for the AI spec lookup. When **Research specs in the background after save** is on (default, Settings toggle `fp_asset_bg_specs`), the asset is written to Zoho immediately and a background worker researches the spec from a captured identity snapshot (so it keeps working after the tech moves on) and writes `Model_AI_Specs` via a follow-up `update_equipment` — with the OLD SPEC archive on updates. The job runs through the existing Pending AI queue, so it persists and auto-retries on reconnect/rate-limit; each row under **Assets Saved This Visit** shows a live chip (researching… / added / will retry / not identified). Pending-AI retry now also runs with a Gemini-only key. Turn the toggle off to keep the previous save-time (blocking) behavior. |
| v354 | — | **Role-based access — Phase 2 (centralized cloud policy)** — an admin can **Publish policy to cloud** from the Access & Roles panel: the user-role tab/settings/capability permissions, the shared admin PIN hash, and a default role are stored in one org-wide record via new `policy_push`/`policy_pull` actions on the `key-sync` function. Writes are protected by a publish passphrase (scrypt hash stored server-side, wrong passphrase → 403); reads are open. Every device applies the cached policy at startup and pulls the latest ~1.2s after open (and via **Pull policy now**), so roles are configured **once** instead of per device. `getRole()` honors the policy's default role for unconfigured devices. Client-side guardrails still (Phase 3 = server-enforced checks). |
| v353 | — | **Admin-gated asset delete + gate pending-queue clears** — the destructive capability now also covers **Clear Sync** and **Clear AI** (pending-queue clears) — hidden for users without the capability and blocked at the function. Added a **Delete Asset from Zoho** button in the Assets form, shown only when an existing asset is loaded and only to admins / users with the destructive capability; it calls the new `delete_equipment` Zoho proxy action (`DELETE /crm/v3/Equipments/{id}`, proxy build 286), removes the asset from Saved This Visit, and resets the form. Requires the Netlify zoho-proxy redeployed to build 286+. |
| v352 | — | **Fix Access & Roles checkbox layout** — the admin permission checkboxes inherited the global `input{width:100%}` rule, stretching each checkbox full-width and pushing its label to the far right. Constrained the RBAC checkboxes (`width:auto;flex:0 0 auto`) with a flex label so checkbox + label sit together. |
| v351 | — | **Role-based access — destructive-action capability** — added a per-`user` capability gate for data-destroying actions (Clear All History, Free Up Space / remove old photos, Reset App Cache, Clear WorkDrive cache). Off for users by default; admins toggle it in the Access & Roles panel ("User can delete / clear data"). Buttons are hidden for users without the capability (`data-cap="destructive"`) and the functions also refuse to run as a second layer. Asset-delete, when added, will use the same gate. |
| v350 | — | **Role-based access — Phase 1 (admin/user guardrails)** — new **Access & Roles** card in Settings. A device is `admin` or `user`; admin sees everything, user sees only the tabs and settings groups an admin allows. Admin unlocks via a PIN (`fp_admin_pin`, hashed), configures per-`user` tab and settings-group access (checkboxes), and switches a device to User mode. Nav is gated in `bootApp`/`go()` (hidden tab buttons + landing-tab redirect); Settings tab and the Access card always stay reachable to avoid lockout; the header **KEY** button hides when API Keys are restricted. Client-side guardrails only (not a hard security boundary); policy persists in `localStorage` (`fp_role`, `fp_perms`). Centralized/enforced roles are Phase 2+. |
| v349 | — | **AI prefill with confirmation gate** — nameplate extraction now also reads output signal (4-20 mA/HART), power supply, engineering units, and enclosure rating and maps them to fields; a new **Research & prefill** step (automatic after extract, with a Settings toggle `fp_asset_auto_research`, plus a manual button) researches the identified model and fills only still-empty spec fields as suggestions. Nameplate values win over research; research never overwrites. Every AI-prefilled field (OCR or research) is flagged **pending confirmation** — Save is blocked until the technician reviews/confirms them (amber highlight + "Confirm N prefilled fields" banner). Update/restore/manual entry are unaffected. |
| v347 | — | **Gemini-primary, Claude-fallback for Model_AI_Specs (merge removed)** — replaced the two-draft-plus-merge design with a simpler, more reliable strategy: CapStone asks Gemini (the authoritative source) for the spec and uses it directly; Claude is queried only when Gemini is absent/skips/errors, and its draft is used verbatim. This removes the fragile merge step (its empty/`SKIP` output was discarding good specs and reporting "AI could not identify this instrument"), cuts a two-key save from three model calls to one, and keeps Claude as a safety net for Gemini's off-days (429s, AQ zero-quota keys, retired-model 404s) and for Claude-only users. Deleted `mergeModelAiSpecsDrafts()`/`MODEL_AI_SPECS_MERGE_SYSTEM_PROMPT`; status note now reads "from Claude (Gemini fallback) — …" and nudges Claude-only users to add a Gemini key. Supersedes v346. `CALIBRATION_SPEC_RULES.md` + `AGENTS.md` updated |
| v346 | — | **Don't drop a good Model_AI_Specs when the merge is inconclusive** — the field was skipping ("AI could not identify this instrument") even for real instruments. Root cause: when both Claude and Gemini returned a valid draft but the Gemini merge step returned nothing usable (empty output from "thinking"-token exhaustion, or a stray `SKIP`), CapStone discarded both drafts and reported a skip. It now falls back to the priority (Gemini) draft in that case, surfaced as a `partial` merge warning. Also hardened `SKIP` detection to ignore stray quotes/punctuation (`"SKIP"`, `SKIP.`) and told the merge prompt never to answer `SKIP` since its drafts already passed a usability check |
| v343 | — | **Web-search grounding for Model_AI_Specs** — specs were "failing quite a bit" (too many `NOT VERIFIED`/`SKIP`) because the models answered from memory; both draft calls now search the web using the `Asset_Brand` + `Asset_Model_Number` before answering (Gemini `google_search` grounding, Claude `web_search` tool) so accuracy/zero/span come from the actual manufacturer datasheet, with the source cited in `[AI-gen]`. Search is gated behind a `search` option on `callAPI`/`callGeminiAPI`, is version-aware for Gemini (`google_search` vs `google_search_retrieval`), and falls back gracefully to a no-tool call if a model rejects the tool; `CALIBRATION_SPEC_RULES.md` and `MODEL_AI_SPECS_SYSTEM_PROMPT` updated to require search-first |
| v342 | — | **Gemini is the priority source for Model_AI_Specs** — Gemini is now fetched first, is the single-draft fallback when a merge fails, and does the merge itself (falling back to Claude only if no Gemini key). The merge prompt treats Gemini's confident figures as authoritative on conflicts (Claude fills gaps only), and attribution lists Gemini first (e.g. `[AI-gen: Gemini+Claude, …]`). Kept in sync in `docs/CALIBRATION_SPEC_RULES.md` |
| v341 | — | **Accurate Model_AI_Specs provider diagnostics** — when only one AI returns a spec, CapStone now distinguishes *the other AI couldn't identify this model* (it returned `SKIP`) from *the other AI actually errored*. A `SKIP` no longer shows the misleading "other AI provider failed; check API keys." message — it now reads "…couldn't identify this specific model (not an API-key problem)." A genuinely empty (non-`SKIP`) response is surfaced as a real warning instead of being dropped silently. Skip state is remembered in the in-memory spec cache so repeat lookups report the same accurate note |
| v340 | — | **Auto-detect available Gemini model** — hardcoded model ids kept 404ing on some accounts; CapStone now queries the ListModels API, picks the best `generateContent` flash model (preferring `gemini-flash-latest`), caches it, and re-resolves automatically on a 404; still overridable via `localStorage.fp_gemini_model` |
| v339 | — | **Gemini model update to gemini-2.5-flash** — `gemini-2.0-flash` returns 404 (retired); default model is now `gemini-2.5-flash`; model is overridable via `localStorage.fp_gemini_model`; clearer 404 "model unavailable" message |
| v338 | — | **Detect Gemini AQ.-key zero-quota 429** — recognizes `free_tier_requests limit: 0` / RESOURCE_EXHAUSTED responses (common with Google's new AQ.-prefixed keys), fails fast without pointless retries, and shows actionable guidance (create a standard AIza key or enable billing); Gemini key modal warns about the AQ. zero-quota issue; Claude specs continue to work |
| v337 | — | **Gemini 429 backoff jitter + spec cache** — retry/inter-provider delays add random jitter to avoid synchronized retries; identical brand/model/type spec lookups reuse an in-memory cache within a session, cutting duplicate Gemini calls that trigger per-minute 429s |
| v336 | — | **Gemini 429 rate-limit resilience** — Model_AI_Specs queries Anthropic then Gemini sequentially (not parallel burst); Gemini API retries 429/503 with exponential backoff; merge step falls back to single draft on failure; clearer message that 429 is requests/minute cap, not monthly quota |
| v335 | — | **Key Sync auto-restore + Gemini cross-device** — `fp_gemini_api_key` documented in Key Sync; new **Auto-restore missing keys on startup** toggle (default on) pulls missing Anthropic/Gemini keys from cloud when technician + passphrase match; fill-missing restore does not overwrite keys already on device; API key save toasts explain cross-device sync; clearer Model_AI_Specs status when only one AI provider is available |
| v334 | — | **AMD number in description + persistent asset save history** — after save, CapStone fetches assigned `CAC_Asset_ID` (retries if needed), prepends `CAC Asset ID: AMD####` to Description/Instructions (UI + Zoho), and lists all assets saved this visit in **Assets Saved This Visit** at the bottom (bold AMD, timestamp, reopen); history persists in `localStorage` across reload |
| v333 | — | **Start New Asset button** — clears a loaded or saved asset and switches back to Add New mode (keeps deal/account, GPS, Saved This Visit); shown after save, reopen, or restore when form is update-ready; blocks post-save draft from re-locking the form into update mode |
| v332 | — | **Fix asset update save INVALID_DATA invalid id** — do not send Account name as lookup id on update; omit Account when only a name is known; validate equipment and subform row ids before Zoho writes; clearer Zoho field name in save errors |
| v331 | — | **Fix asset restore — full fields and photos** — asset draft photos offload to IndexedDB (like Capture); draft restore hydrates photos from IDB; Saved This Visit snapshot stores category dynamic fields, subform rows, and photos; Reopen fetches full Zoho record via `get_equipment` and restores local photos; Load Existing Asset uses full record fetch (includes Description_Instructions) |
| v330 | — | **Model_AI_Specs on asset update** — updates now generate fresh AI specs and archive the previous active spec under `<b>OLD SPEC</b>` (two blank lines below the new spec); prior archive chain preserved; `get_equipment` fetches `Model_AI_Specs` |
| v329 | — | **Fix Model_AI_Specs missing on new asset save** — force fresh AI lookup on save; write specs via post-create Zoho update (after category layout); Gemini uses `x-goog-api-key` header for AQ. keys; show clear status when specs are skipped or API fails |
| v328 | — | **Saved This Visit shows assigned asset number** — after new asset save, the bottom overview lists Zoho `CAC_Asset_ID` first in bold ALL CAPS, then name/model/serial |
| v327 | — | **Model_AI_Specs format: accuracy first, bold caps headers** — ACCURACY is now the first line; section and field labels use `<b>ALL CAPS</b>` HTML (ZERO/LRL, SPAN/URL, GENERAL, CAL NOTES); `CALIBRATION_SPEC_RULES.md` and both AI prompts updated |
| v326 | — | **Accept new Gemini auth keys (AQ. prefix)** — Google AI Studio now issues authorization keys starting with `AQ.` instead of legacy `AIza` standard keys; CapStone Settings accepts both formats |
| v325 | — | **Multi-AI Model_AI_Specs generation** — on new asset save, CapStone queries Anthropic Claude and Google Gemini in parallel (when each API key is configured), then merges the drafts into one field following `CALIBRATION_SPEC_RULES.md`; Settings adds a Gemini API key (cloud-synced via Key Sync); single-provider fallback when only one key is set |
| v322 | — | **Auto-generate Model_AI_Specs on new asset save** — when Add New Asset creates a Zoho Equipment record, CapStone calls Anthropic (existing report-generation key) to write the Model_AI_Specs field (accuracy basis + published spec or NOT VERIFIED + brief cal notes) into the same create payload, so it is populated before the technician performs the calibration; skipped for placeholder/junk model numbers, missing API key, or when updating an existing asset (never overwrites a value already in Zoho) |
| v324 | — | **New shared calibration rules reference** — `docs/CALIBRATION_SPEC_RULES.md` consolidates the reusable Model_AI_Specs rules (six accuracy bases, family traps, metal-detector paradigm, sensor-model gap, output format) pulled out of the one-time backfill working file; `MODEL_AI_SPECS_SYSTEM_PROMPT` in `src/app.js` rewritten to match it in full instead of the earlier condensed/generic version; `AGENTS.md` points future Claude/Cursor sessions at the doc so both stay in sync |
| v323 | — | **Fix Assets tab draft restore wiping the form** — `ensureAssetContext()` ran on every Assets tab render, including immediately after a draft restore, and its deal/account mismatch check could fire during that restore and call `clearAssetEntryState()`, blanking every asset field, resetting photos, and deleting the just-restored draft from `localStorage` — while leaving the Deal/Account (never touched by that path) looking fine. Fixed by skipping the mismatch check while `A.asset._draftRestoreFields` is still pending application. Model/serial/name/building/description/notes/photos/dynamic category fields/subform rows now survive a full page close and reopen. |
| v322 | — | **Remove hardcoded Zoho OAuth credentials from client JS** — `refresh_token` now sourced server-side in `zoho-proxy.js` from `ZOHO_REFRESH_TOKEN` / `ZOHO_CLIENT_ID` / `ZOHO_CLIENT_SECRET` Netlify env vars; `app.js` no longer ships the refresh token or client secret; proxy build 284 |
| v321 | — | **Rosemount Details brand filter** — Flow Meter Rosemount section only when Asset Brand is Rosemount; hidden for Siemens and other brands |
| v320 | — | **Asset optional section toggles** — hide Sensor (Other attached Parts) and Set Up Output per layout; hidden fields not required and omitted from Zoho save |
| v312 | — | **Fix History empty after Save Locally** — storage-pressure path no longer drops the current capture before writing History |
| v311 | — | **Save Locally under storage pressure** — auto-clear duplicate capture draft, trim older History photos, retry save; clearer storage warning |
| v309 | — | **Key Sync auto-backup** — Settings toggle (default on); debounced cloud push after API key, Plaud, or synced toggle changes; manual backup still available |
| v308 | — | **Cloud sync Phase 1 — key sync by Zoho technician name** — Settings → Key Sync (Cloud) backs up/restores API key + app settings, keyed by technician name, passphrase-protected; new `key-sync` Netlify function (Netlify Blobs, AES-256-GCM at rest); `docs/CAPSTONE_KEY_SYNC.md` |
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
| v307 | — | **Scales &amp; Balances category layout** — sensor, display, Scales (Scale Class), Subform_1 |
| v306 | — | **Lift Station category layout** — sensor, display, LS Details (LS Shape, LS Diameter, Number of Pumps), Subform_1; Zoho API names confirmed live |
| v305 | — | **Flow Meter Rosemount Details** — DA1/DA2, DA2 License, Totalizer Display, Rosemount LOI Display on Flow Meter layout (magnetic flow meter); restore layout reference images in `docs/asset-layouts/` |
| v304 | — | **Fix General Set Up I/O + subform Function sync** — resolve engineering-unit lookup names to Zoho IDs on save (client + proxy); load live subform Function picklist; dedicated subform save uses layout_rules; stop subform fields leaking into dynamic handlers; proxy build 283 |
| v303 | — | **Fix duplicate Input/Output subform rows** — strip Subform_1 from core create/update payload; save subform rows once in dedicated final pass (Zoho was appending duplicates) |
| v302 | — | **Fix General saving as Analytical in Zoho** — resolve Asset_Category to General actual_value (not legacy Analytical display alias); layout activation treats General and Analytical as distinct; proxy build 282 |
| v301 | — | **General category layout fields** — sensor, display, setup I/O, duration &amp; damping, Subform_1 (Zoho General / legacy Analytical alias) |
| v300 | — | **General / Analytical category alias** — CapStone picker shows Zoho **General**; legacy Analytical normalizes on load/save; proxy resolves General actual_value |
| v298 | — | **Gas Detector layout trim** — remove Set Up Input/Output parent fields; keep Input and Output Set ups subform |
| v297 | — | **Assets: Gas Detector category fields** — sensor, display, duration &amp; damping, Gas Sensor Info (type + multiselect), Subform_1; asset search includes Gas Sensor Type |
| v296 | — | **Remove Open Channel Flow picker alias; align category fields** — Asset Category shows Flow Open Channel only; legacy Open Channel Flow normalizes on load; category layout uses aligned 2-column grid |
| v295 | — | **Flow Meter Zoho category fix** — do not map Flow Meter to deprecated Zoho picklist value Flow; resolve and save canonical Flow Meter actual_value |
| v294 | — | **Fix category extension save invalid data** — resolve engineering-unit lookups to Zoho IDs before save; omit unresolved lookups; save extension fields with category + layout_rules |
| v293 | — | **Flow Meter Asset Category choice** — merge live Zoho Asset_Category picklist into dropdown; Flow Meter always available as a selectable category |
| v292 | — | **Asset draft restore on load** — preserve draft when loading existing asset; block partial draft saves mid-load; restore form fields, category fields, and photos after reload |
| v291 | — | **Category layout category-only** — Flow Meter/FOC fields render from Asset Category only; brand/series update conditional defaults without re-render race; recover from stuck Loading state |
| v290 | — | **Flow Meter Set Up Input default GPM US** — aligns Flow Meter input engineering unit auto-fill with display units |
| v289 | — | **Flow Meter category polish** — Duration & Damping section aligned with Flow Open Channel; Duration default 0.75; Pulsar Ultra 4 PV parameters; Cal Factor/Pipe Size only in Flow Meter Details |
| v288 | — | **Subform Function save + Date Installed optional + P838/P839** — Input/Output Function (Output_Type) persists to Zoho; subform row IDs preserved; dedicated subform save pass; Date Installed red reminder but not mandatory; Pulsar Ultra 4 → Output PV P838/P839 |
| v287 | — | **Duration and Damping as separate fields** — Flow Open Channel shows both Duration and Damping Seconds side by side; default 0.75 applies to Duration only; asset search includes Duration |
| v286 | — | **Fix FOC category layout load** — guard concurrent category renders; safe lookup option handling; Duration & Damping section between Set Up Input and Set Up Output |
| v285 | — | **Fix category default auto-fill wipe** — pre-render DOM sync was clearing applied defaults from empty selects; skip sync on category re-render; push values to DOM after render; lookup options include resolved default |
| v284 | — | **Auto-fill all category suggested defaults** — GPM US, H2O Inches, 4-20 mA, 0.75, P005/P006 apply to empty fields consistently (not just Output EU); fix phantom DOM sync on untouched selects |
| v283 | — | **Category suggested defaults after AI extract** — refresh Flow Open Channel / conditional P005–P006 hints when Brand/Series filled by extract or category selected afterward; re-apply lookup defaults after engineering-unit load |
| v282 | — | **Program-wide field auto-advance** — picklist change or Enter on text/number advances to next field on all tabs and modals (Deals filters, Capture context, Assets, Map filters, Settings, deal/account pickers); documented as mandatory dev rule |
| v281 | — | **Asset field auto-advance** — after picklist select or Enter on text/number, focus moves to next field (main form + category layout) |
| v280 | — | **FOC Output 4-20 mA for all assets** — Set Up Output Engineering Units suggested 4-20 mA for every Flow Open Channel new/update |
| v279 | — | **Asset photo Other label fix + tab draft persistence** — Use Label enables when Other text entered; asset draft saves on tab switch/background; FOC P005/P006 when Pulsar + Ultra 4 |
| v278 | — | **Flow Open Channel suggested defaults** — Input EU H2O Inches, Display GPM US, Duration 0.75; P005/P006 when Brand Pulsar + Series Ultra 4; refreshes on brand/series change (Duration is separate from Damping Seconds) |
| v277 | — | **Category fields touch-required** — all Asset Category layout fields (Set Up Input/Output, sensor, OCM, etc.) use mandatory light-red styling until explicitly entered; defaults shown as suggestions only |
| v276 | — | **Subform Input/Output fixes** — Function picklist Input/Output; stop triple-saving Subform_1 during layout activation; mandatory touch-required red styling on all subform fields; Engineering Unit hint 4-20 mA for Output |
| v275 | — | **Flow Open Channel category fix** — Zoho picklist actual_value is **Flow Open Channel** (not Open Channel Flow); proxy + CapStone normalize all OCF variants; Settings requires proxy build 275+ |
| v274 | — | **Zoho OCF update layout fix** — longer pauses between category reselect steps; double-select same category on update/reopen pass; proxy resolves OCF picklist from live Zoho metadata; Settings requires proxy build 274+ |
| v273 | — | **Zoho proxy verify + picklist resolve** — Settings → Check Zoho Proxy (build 273+); block category save if proxy outdated; resolve Asset_Category from live Zoho picklist metadata |

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
| 2026-06-25 | `README.md` — sync milestone build to v307; add Inbox, Accounts Map, and asset category layouts; update versioned URLs |
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
| Medium | **Asset category field rollout** | All categories shipped through **Scales &amp; Balances (v307)** — Flow Meter, FOC, Gas Detector, General, Lift Station, Scales &amp; Balances |
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
