# CapStone Program Review — July 2026

Independent full-program review requested by the owner ("look over my CapStone program and
tell me what you think" — improvements, efficiency, reliability in/out of service areas, and
security against cyber attack / Zoho infiltration).

```text
Reviewed: 2026-07-20
Reviewed against: FP_VERSION 357 (src/app.js), zoho-proxy build 287
Scope: FieldPro.html, src/app.js (~8,570 lines), src/accounts-map.js, src/styles.css,
       all netlify/functions/*.js, netlify.toml, repo hygiene
Method: static read of the whole codebase + node --check on app.js and all functions
```

> **Note on the two-review plan.** The owner asked for this same review to be run so it could be
> merged with a prior Grok review into one roadmap. Grok's written output was **not present in the
> repo or the request**, so the roadmap below is built from this review alone. Where a Grok finding
> exists, drop it into the matching roadmap row — the structure is designed to absorb a second
> source without renumbering. See "How to merge the Grok review" at the end.

---

## 1. Executive summary

CapStone is a genuinely capable field tool: offline-first capture, drafts, pending-sync queues,
IndexedDB offload for photos, a rich Zoho asset/category workflow, and an OSM accounts map — all in
a dependency-free static app. The **local-data design is strong**. The three areas that need
attention are, in priority order:

1. **Security of the Zoho path.** The proxy's auth secret is hard-coded in public JavaScript, a
   Zoho OAuth `client_secret` is committed to the public repo, and several Netlify functions are
   fully unauthenticated. Today, "infiltration into Zoho" is realistically possible for anyone who
   reads the public repo. This is the single most important area to fix.
2. **Reliability edge cases that can lose field data.** Corrupt or over-quota `localStorage` can
   silently empty or truncate History, and there is no service worker, so a cold load with no
   signal can fail to boot the app shell at all.
3. **Maintainability & efficiency.** One 8,500-line file, a stale duplicate `app.js` at the repo
   root, full-array JSON rewrites and full list re-renders that scale poorly on an Android phone
   holding thousands of cached deals.

Nothing here means the app is "broken" — it's that the same care already visible in the draft/queue
code needs to reach the Zoho security boundary and a few data-loss edges.

---

## 2. What is working well (keep doing this)

- **Local-first save order.** Capture saves to History before touching the network (v196), with
  autosave on `visibilitychange`/`pagehide`. This is exactly right for flaky signal.
- **Debounced drafts.** Capture/asset drafts write on an 800 ms debounce rather than per keystroke,
  with a longer History spill — good balance of durability vs. write churn.
- **Pending-sync queues.** `fp_pending_uploads` / `fp_pending_ai` retry on app open, on `online`,
  on foreground, and on a 2-minute interval, with attempt counters and a minimum auto-retry gap.
  Photo/PDF binaries are offloaded to IndexedDB so the queue itself stays small.
- **Server-side Zoho tokens.** v357 moved the Zoho refresh/access token entirely server-side; the
  browser never holds a Zoho token anymore. That was the right call and it's implemented cleanly.
- **Key Sync encryption.** Cloud key-sync encrypts settings at rest with AES-256-GCM via a
  scrypt-derived key. The cryptography itself is sound.
- **Domain discipline.** The calibration spec rules, category-layout activation sequences, and the
  changelog/roadmap discipline are unusually thorough for a solo project.

---

## 3. Security review (highest priority)

Threat framing the owner asked about: (a) generic cyber attack on the app, and (b) someone getting
**into Zoho** through CapStone. The findings below are ordered by how directly they enable (b).

### 3.1 Critical

**S1 — The proxy "app secret" is public, so the Zoho gate is effectively open.**
`src/app.js:4` ships `PROXY_APP_SECRET="61849deda9adf77577f134c4ca35b080667a96d7cae0281a"` in a
**public** repo served on GitHub Pages. The proxy checks this value (`assertAppSecret` in
`netlify/functions/zoho-proxy.js`) before every action — but since the value is public, anyone can
send it. That grants an anonymous internet caller the full proxy surface under the org's Zoho
refresh token: read Deals/Accounts/Equipment/Notes, **create/update/delete Equipment**, write deal
subforms and notes, upload attachments, upload to WorkDrive, and burn Google Geocode billing.
*This is the "infiltration into Zoho" risk, and it is live today.*

**S2 — Zoho OAuth client secret committed to the public repo.**
`self_client (3).json` is tracked in git and contains `client_secret`, `client_id`, and a `code`.
Even though the live proxy now reads OAuth from env vars, the secret is in the public history and
must be treated as compromised. `git log` shows it was added in commit `e4d53dc`.

**S3 — `submit-recording.js` is an unauthenticated, owner-funded AssemblyAI proxy.**
No app secret. Any caller can POST an arbitrary `audio_url` (or up to 5 MB `audio_b64`) and it is
submitted to AssemblyAI on the site's `ASSEMBLYAI_API_KEY`. That is direct cost abuse plus a
server-side fetch of attacker-chosen URLs. `get-transcript.js` is likewise unauthenticated and can
read any transcript on the account by ID.

### 3.2 High

**S4 — `delete_equipment` is reachable behind only the public secret.** Destructive CRM delete with
no per-user auth, confirmation, or soft-delete (`zoho-proxy.js` ~line 1304). Combined with S1 this
is remotely exploitable.

**S5 — Client-controlled Zoho module/path in two actions.** `get_map_events` concatenates
`data.crm_module` **unencoded** into the request path (`/crm/v3/<mod>...`), and
`list_engineering_units` lets the caller pass any `module_api_name`. The hostname is fixed
(`www.zohoapis.com`), so this is not classic SSRF, but it broadens the proxy into a general GET
across whatever modules the refresh token can read, and the unencoded path allows query smuggling.

**S6 — Key Sync `push` has no proof of the prior passphrase.** `handlePush` in `key-sync.js`
encrypts with whatever passphrase the caller supplies and overwrites the technician's record —
there is no check that the caller knew the old passphrase. Knowing a technician's name is enough to
clobber their backup (denial of service) or plant attacker settings. Synced fields include
`fp_api_key`, `fp_gemini_api_key`, `fp_plaud_tokens`, and `fp_proxy_secret`. Minimum passphrase
length is 4.

**S7 — Org role policy is weakly protected.** `policy_pull` is open; the admin PIN is hashed with a
non-cryptographic djb2-style `fpSimpleHash` (32-bit) and distributed in the policy, so a pulled
hash is trivially brute-forced. Role-based access is enforced **only in the client UI** (a DevTools
user bypasses it). The first `policy_push` silently sets the publish passphrase forever
(first-writer-wins bootstrap).

### 3.3 Medium

- **S8 — `picklist-request.js`** sends email via `RESEND_API_KEY` with **no auth** and reflects
  user-supplied subject/body → spam/cost abuse.
- **S9 — `transcript-ready.js`** webhook has no signature/shared-secret check; forgeable (low
  direct impact, ack-only).
- **S10 — `plaud-proxy.js`** has no app secret and open CORS; relays caller-supplied Plaud tokens.
- **S11 — CORS conflict.** `netlify.toml` sets `Access-Control-Allow-Origin: *` globally for `/*`,
  which fights the careful per-origin allowlist in `zoho-proxy.js`.
- **S12 — No rate limiting or alerting** on any function — amplifies every cost-abuse vector above
  (AssemblyAI, Geocode, Resend, Zoho API, Netlify invocations).
- **S13 — Upload actions decode `*_b64` with no size cap** (`upload_photo`,
  `upload_deal_attachment`, `upload_equipment_photo`, `workdrive_upload`) → memory-pressure DoS.
- **S14 — Error/config leakage.** Outer catches return raw `err.message`; some WorkDrive paths
  return response snippets in a `debug` field.
- **S15 — Client-side XSS surface.** `esc()` escapes only `& < >`, not quotes, while several
  templates interpolate Zoho/user values into `onclick='..."+esc(id)+"'"` attributes and the report
  photo grid injects `p.display`/`p.time` into HTML strings. A malicious deal/asset name or photo
  label could break out. Report body itself correctly uses `textContent`.

### 3.4 Low

- **S16 — API keys in `localStorage`** (`fp_api_key`, Gemini, Plaud tokens, proxy secret). Standard
  for a static SPA, but worth noting they are readable by any script that runs in the page.
- **S17 — Hard-coded WorkDrive parent folder** in public JS (`WORKDRIVE_FOLDER`, `src/app.js:8`)
  hands an attacker (who has the public secret) the exact upload target.
- **S18 — Wrong-passphrase key-sync error echoes the technician name.**

---

## 4. Reliability review (in and out of service areas)

The offline architecture is the app's strength; these are the edges where field data can still be
lost or the app can fail to start.

### 4.1 High

**R1 — No service worker / PWA manifest.** There is no `manifest.json` and no service worker in the
repo, and `FieldPro.html` is served `no-cache, no-store`. That means a **cold load with no signal
cannot boot the app shell** — offline only works if the browser happens to still hold the HTML/JS/CSS
in its HTTP cache. jsPDF and Google Fonts are also CDN-loaded. For a tool whose whole point is
working out of service areas, an installable offline shell (precache HTML/JS/CSS + self-host jsPDF)
is the biggest single reliability win available.

**R2 — Corrupt `fp_history` silently empties History.** `getHistory()` catches a JSON parse error
and returns `[]`. The corrupt blob is not quarantined, so the next save can overwrite the remaining
data. Compare this with the deal cache, which at least clears and can be re-fetched — History has no
equivalent recovery messaging and the data isn't re-fetchable.

**R3 — Quota pressure can drop History to 5 (or 3) records or strip photo metadata.**
`persistHistoryRecords` intentionally triages under storage pressure, but the practical effect is
silent loss of older visits' data on a full device.

### 4.2 Medium

- **R4 — Duplicate Zoho submissions on retry.** Asset/deal notes always `save_note` with no
  idempotency marker, so a retry after a success the client never saw creates a duplicate note.
  Report notes are better (they look up an existing note first), but `uploadPendingReportNote`
  doesn't persist the returned `note_id` back into the queue/History on success, so a later retry
  can still duplicate. There is dedup for photos/PDFs/report-notes/videos but **none** for
  `deal_asset_link`, `equipment_note`, or `deal_asset_note`.
- **R5 — CDN dependency for core output.** PDF generation depends on the jsPDF CDN; if it's
  unreachable in the field, PDF export fails even though all data is local.
- **R6 — Version/update model is fragile.** `FP_VERSION` plus three `?v=` cache-bust strings in
  `FieldPro.html` must be kept aligned by hand, and the in-app update check fetches the entire
  `src/app.js` from raw GitHub. Easy to ship a mismatched version; expensive check on a metered
  connection.

### 4.3 Low

- **R7 — Storage warning is a rough estimate.** `getStorageSize()` is a UTF-16 character estimate;
  the "of 5 MB" figure is approximate and browser quotas vary.
- **R8 — Many timers run app-wide** (transcript poll 8 s, pending retry 120 s, Plaud pull, inbox
  poll) — individually cheap but they add up to steady background wakeups/battery on a phone.

---

## 5. Efficiency review

- **E1 — Deals list fully rebuilds on every search keystroke.** `oninput="applyFilters()"` clears
  `deals-list` and recreates every card. With thousands of cached deals (the AGENTS.md example
  seeds ~6,000) this is a visible Android jank source. Debounce input and/or virtualize/windowe the
  list, and diff rather than full-rebuild.
- **E2 — Full-array JSON I/O for History.** Every `getHistory()` does a full
  `JSON.parse(localStorage.getItem("fp_history"))` and every save re-`stringify`s the whole array;
  `getHistory()` is called ~22 times across flows. An in-memory cache invalidated on write would cut
  most of this.
- **E3 — `fp_deals` fully stringified on each refresh/import** — often the largest key; fine
  occasionally, but it's on the hot path of a Zoho refresh.
- **E4 — Base64-in-JSON uploads.** Photos/PDFs/videos are sent as base64 inside the JSON body
  (~33% larger than binary). Fine for photos, heavier for the 2 MB video path.
- **E5 — Heavy startup.** IndexedDB init → cache parse → RBAC → history render → deals render →
  draft-restore timers → pending retries → key-sync pull → org policy → Plaud/inbox timers, plus an
  optional full-`app.js` fetch for the update check. Worth deferring non-critical steps until after
  first paint.
- **E6 — 66 `innerHTML` rebuilds** across panels; several rebuild entire lists rather than patching.

---

## 6. Architecture & maintainability

- **A1 — One 8,500-line `src/app.js`** with a single mega-state object and ~87 `window.*` exports,
  no modules or bundler. Reviewable only by section comments. This is the root cause behind how easy
  it is to introduce the duplication/XSS/idempotency issues above.
- **A2 — Stale duplicate `app.js` at the repo root** (`FP_VERSION 322`, ~7,255 lines). `FieldPro.html`
  only loads `src/app.js?v=357`, so the root copy is dead weight and an active "edited the wrong
  file" trap. (The root `zoho-proxy.js` is a deliberate labeled stub — leave it or document it.)
- **A3 — Committed binaries/spreadsheets** (`all fileds.xlsx`, `flow meter.xlsx`, a screenshot,
  `self_client (3).json`) live in the repo root and bloat it; the JSON is also the S2 secret leak.
- **A4 — Inline HTML event handlers** (`onclick=`, `oninput=`) tightly couple the 1,000-line HTML
  shell to globals, which is what forces the string-concatenation templating that creates the XSS
  surface.

---

## 7. Prioritized roadmap

Ordered by value-to-risk. Each item is scoped as a focused PR consistent with the project's existing
small-PR rhythm. Severity tags map to the findings above. "Grok:" rows are placeholders to fill in
when that review is available (see §8).

### Phase 0 — Contain the live Zoho exposure (do first)

| # | Action | Addresses | Notes |
|---|--------|-----------|-------|
| 0.1 | **Rotate the Zoho OAuth client secret and refresh token** in Zoho, then set new values only in Netlify env vars. | S1, S2 | The committed secret must be considered burned. |
| 0.2 | **Rotate `CAPSTONE_APP_SECRET`** and stop treating a public-JS constant as a real gate. Short-term: move to a per-device enrollment secret entered once and stored in `fp_proxy_secret` (already supported), not shipped in source. Longer-term: Netlify Identity / short-lived signed tokens. | S1 | The current `getProxyAppSecret()` device-override path is the migration seam. |
| 0.3 | **Purge secrets from the repo and history**: delete `self_client (3).json` (and the xlsx/screenshot) from the tree, add them to `.gitignore`, and scrub history (e.g. `git filter-repo`). | S2, A3 | Coordinate a force-cleanup separately from feature branches. |
| 0.4 | **Authenticate or disable the open functions**: require the app secret (post-0.2) on `submit-recording`, `get-transcript`, `picklist-request`, `plaud-proxy`; add an AssemblyAI-side allowlist or drop arbitrary `audio_url`. | S3, S8, S10 | Biggest cost-abuse closers. |
| 0.5 | **Remove or hard-gate `delete_equipment`** (admin-only server check, not just UI role). | S4, S7 | |

### Phase 1 — Harden the proxy surface

| # | Action | Addresses |
|---|--------|-----------|
| 1.1 | Allowlist `crm_module` / `module_api_name` to the exact modules used; URL-encode every path segment. | S5 |
| 1.2 | Add per-IP / per-secret rate limiting + basic abuse logging/alerting to all functions. | S12 |
| 1.3 | Cap decoded upload sizes on all `*_b64` actions; sanitize multipart `filename`. | S13, S16(fn) |
| 1.4 | Stop leaking raw errors / `debug` snippets to clients; return generic messages, log detail server-side. | S14 |
| 1.5 | Remove the global `Access-Control-Allow-Origin: *` from `netlify.toml`; rely on each function's allowlist. | S11 |
| 1.6 | Key Sync: require proof of the prior passphrase (or a signed token) on `push`; raise min length; fix the policy first-writer bootstrap; replace `fpSimpleHash` with a real KDF and stop distributing the PIN hash. | S6, S7 |
| — | *Grok security findings:* _(insert here)_ | — |

### Phase 2 — Close the field data-loss edges

| # | Action | Addresses |
|---|--------|-----------|
| 2.1 | **Add a service worker + web manifest**: precache the app shell (HTML/JS/CSS), self-host jsPDF and fonts so PDF/output works fully offline. | R1, R5 |
| 2.2 | **Quarantine corrupt `fp_history`** instead of silently returning `[]`: back up the bad blob to a side key, surface a recovery message, and never overwrite it blindly. | R2 |
| 2.3 | **Make quota triage non-destructive**: before dropping History records, push the overflow into IndexedDB (or an export prompt) rather than deleting older visits. | R3 |
| 2.4 | **Idempotent sync**: attach a client-generated dedup key to `save_note`/`save_equipment_note`/`deal_asset_link`, and persist returned `note_id`s back into the queue/History on success. | R4 |
| — | *Grok reliability findings:* _(insert here)_ | — |

### Phase 3 — Efficiency & maintainability

| # | Action | Addresses |
|---|--------|-----------|
| 3.1 | Debounce the Deals search and render incrementally (diff or windowed list). | E1 |
| 3.2 | In-memory History cache invalidated on write; avoid re-parsing `fp_history` per call. | E2 |
| 3.3 | Delete the stale root `app.js`; add a guard/test that only `src/app.js` is loaded. | A2 |
| 3.4 | Escape quotes in `esc()` (or move to DOM/`textContent` templating) everywhere Zoho/user data enters an attribute or HTML string. | S15, A4 |
| 3.5 | Defer non-critical startup work until after first paint; make the update check cheaper (version endpoint instead of full-file fetch). | E5, R6 |
| 3.6 | Begin modularizing `src/app.js` by domain (deals/capture/assets/report/history/sync). Incremental, non-blocking. | A1 |
| — | *Grok efficiency/architecture findings:* _(insert here)_ | — |

---

## 8. How to merge the Grok review

This document was written to be the "second opinion" in a two-review merge. To combine:

1. Paste each Grok finding under the matching category (§3 security, §4 reliability, §5 efficiency,
   §6 architecture). Tag agreements (both reviews found it → raise priority) and Grok-only items.
2. Add Grok-only actions to the placeholder rows in the Phase tables (§7), keeping the
   value-to-risk ordering.
3. Where the two reviews disagree, keep both and note the disagreement — don't silently drop either.

If you share the Grok output, I can do this merge and produce a single deduplicated roadmap.

---

## 9. Verification performed for this review

- `node --check src/app.js` — passes.
- `node --check` on all seven `netlify/functions/*.js` — passes.
- `git diff --check` — clean.
- `git ls-files` confirms `self_client (3).json` is tracked (S2); `git log` traces it to commit
  `e4d53dc`.
- All findings are static-analysis based (reading code + repo state). No live Zoho/AssemblyAI/Resend
  calls were made, so exploit *feasibility* is described from the code, not demonstrated against
  production.
