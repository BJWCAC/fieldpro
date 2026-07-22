# CapStone Program Review & Roadmap — July 2026 (merged: Cursor + Grok)

Whole-program review requested by the owner ("look over my CapStone program and tell me what you
think" — improvements, efficiency, reliability in/out of service areas, and security against cyber
attack / Zoho infiltration).

This document **merges two independent reviews** into one deduplicated plan:

- **Cursor review** — static read of the whole codebase against `FP_VERSION 357` / proxy build 287,
  with `node --check` on `app.js` and all functions.
- **Grok review** — reviewed slightly earlier and then **implemented the first fix** (PR #246,
  v357), which is why its top finding is already resolved below.

```text
Reviewed: 2026-07-20
Reviewed against: FP_VERSION 357 (src/app.js), zoho-proxy build 287
Scope: FieldPro.html, src/app.js (~8,570 lines), src/accounts-map.js, src/styles.css,
       all netlify/functions/*.js, netlify.toml, repo hygiene
Sources: Cursor (this pass) + Grok (prior pass + PR #246 lockdown)
```

Each finding is tagged **[both]**, **[cursor]**, or **[grok]** so you can see where the two reviews
agreed (agreement = higher confidence, higher priority) and where each caught something the other
missed.

---

## 1. Executive summary

Both reviews reached the **same headline**: CapStone's field instincts are excellent (local-first
save, drafts, Pending Sync/AI, IndexedDB photo offload, phone-Downloads backup, strong docs and
calibration domain rules). The gap between "great internal tool" and "safe production system" is
**not missing features** — it is three things, in priority order:

1. **Security of the Zoho path.** Grok found and fixed the worst hole (an *open* `refresh_token`
   endpoint anyone could call). What remains: the proxy secret is still public JS, a Zoho OAuth
   `client_secret` is committed to the public repo, several other Netlify functions are still
   unauthenticated, and AI keys live in the browser. This is the "infiltration into Zoho" area and
   still the #1 priority.
2. **Reliability of the app shell out of service areas.** Both reviews independently called out the
   same top item: **there is no service worker / PWA**, so the app files themselves still need
   network to load. Plus a few Cursor-found data-loss edges (history corruption/quota).
3. **Maintainability & efficiency.** One ~8,500-line `src/app.js`, a stale duplicate at the repo
   root, and some hot-path inefficiencies (full-array JSON I/O, full list re-renders, large photos).

### Already fixed (Grok, v357 / PR #246 — proxy build 287)

| Risk | Before | After |
|------|--------|-------|
| Open Zoho token endpoint | Anyone could POST `action:"refresh_token"` and receive a live CRM token | Tokens stay on Netlify only; the browser never receives a Zoho token |
| Open CORS | `Access-Control-Allow-Origin: *` on the proxy | Restricted to CapStone origins (`bjwcac.github.io` + localhost) |
| No proxy gate | No auth on Zoho/WorkDrive actions | Requires `CAPSTONE_APP_SECRET` on every call |

**Owner deploy step still required for v357 to work:** set `CAPSTONE_APP_SECRET` on Netlify to match
`PROXY_APP_SECRET` in `src/app.js`, then **Clear cache and deploy**, then verify with Settings →
Check Zoho Proxy. (Full plain-English steps are in PR #246's discussion.) Phase 0.2 below replaces
this shared secret with something stronger.

---

## 2. What is working well (both reviews — keep doing this)

- **Local-first save order** — Capture writes to History before the network (v196), autosave on
  `visibilitychange`/`pagehide`.
- **Debounced drafts** — capture/asset drafts on an 800 ms debounce, longer History spill.
- **Pending-sync queues** — retry on app open, `online`, foreground, and a 2-min interval; attempt
  counters; IndexedDB offload keeps the queue small.
- **Server-side Zoho tokens (v357)** — the browser no longer holds a Zoho token. Right call, cleanly
  done.
- **Key Sync encryption** — AES-256-GCM with a scrypt-derived key; the crypto itself is sound.
- **Background `Model_AI_Specs` (v355)** — Grok specifically flags this as the right efficiency move
  for field time; keep it.
- **Phone Downloads photo backup** — Grok's note: keep it on; it's the real insurance when the
  browser wipes storage.
- **Docs & domain discipline** — changelog/roadmap, calibration spec rules, category-layout
  sequences.

---

## 3. Security review (highest priority)

Threat framing the owner asked about: (a) generic cyber attack, and (b) someone getting **into Zoho**
through CapStone.

### 3.1 Critical

**S1 — The proxy "app secret" is public, so the Zoho gate is only a speed bump. [both]**
`src/app.js:4` ships `PROXY_APP_SECRET="61849deda9adf77577f134c4ca35b080667a96d7cae0281a"` in a
**public** repo on GitHub Pages. v357 now requires this secret on every proxy call, which stops the
open-token abuse Grok fixed — but because the value is public, a determined attacker can copy it and
still reach the full proxy surface under the org's Zoho token (read/write/**delete** Equipment, deal
subforms, notes, WorkDrive upload, Google Geocode billing). Grok's own words: "the app secret is
still in public client JS … blocks casual abuse … not a determined attacker who copies it." The real
fix is **short-lived device/session tokens** (Phase 0.2).

**S2 — Zoho OAuth client secret committed to the public repo. [cursor]**
`self_client (3).json` is tracked in git and contains `client_secret`, `client_id`, and a `code`
(added in commit `e4d53dc`). Even though v322/v357 moved OAuth to env vars, the secret is in public
history and must be treated as compromised. Grok separately recommended confirming pre-v322
credentials were rotated — this is the concrete artifact that forces it.

**S3 — `submit-recording.js` is an unauthenticated, owner-funded AssemblyAI proxy. [cursor]**
No app secret. Any caller can POST an arbitrary `audio_url` (or up to 5 MB `audio_b64`) and it is
submitted to AssemblyAI on the site's `ASSEMBLYAI_API_KEY` — direct cost abuse plus server-side
fetch of attacker URLs. `get-transcript.js` is likewise unauthenticated and can read any transcript
on the account by ID. (Grok's proxy work covered `zoho-proxy` only; these helpers were out of its
scope.)

### 3.2 High

**S4 — `delete_equipment` reachable behind only the public secret. [cursor]** Destructive CRM delete,
no per-user auth/confirmation/soft-delete (`zoho-proxy.js` ~line 1304). Grok's related point: RBAC is
UI-only, so "admin-only" delete isn't actually enforced at the proxy.

**S5 — Client-controlled Zoho module/path in two actions. [cursor]** `get_map_events` concatenates
`data.crm_module` **unencoded** into the path; `list_engineering_units` takes any `module_api_name`.
Host is fixed (not classic SSRF) but it broadens the proxy into a general GET across whatever the
refresh token can read.

**S6 — Key Sync `push` has no proof of the prior passphrase. [cursor]** `handlePush` overwrites a
technician's record with whatever passphrase the caller supplies — knowing a technician's *name* is
enough to clobber their backup (DoS) or plant settings. Synced fields include `fp_api_key`,
`fp_gemini_api_key`, `fp_plaud_tokens`, `fp_proxy_secret`.

**S7 — Weak Key Sync passphrase + weak RBAC/PIN. [both]** Grok: 4-char minimum is weak for
AES-wrapping API keys; RBAC is UI-only until server enforcement (Phase 3). Cursor adds: the admin PIN
is hashed with a non-crypto djb2-style `fpSimpleHash` (32-bit) and distributed via `policy_pull`
(open), so a pulled hash is trivially brute-forced; the first `policy_push` sets the publish
passphrase forever.

**S8 — AI keys live in the browser. [grok]** Anthropic is called with
`anthropic-dangerous-direct-browser-access` and keys in `localStorage`. Any XSS or a stolen phone
drains/exfiltrates the key. Grok's fix: move Claude/Gemini calls behind a Netlify function the same
way Zoho OAuth was moved in v322; Key Sync can still distribute encrypted config, but the raw key
shouldn't sit in page JS. (Cursor's S15 XSS surface makes this more urgent.)

**S9 — Shared org OAuth = shared blast radius. [grok]** One refresh token powers the whole company
CRM/WorkDrive surface, so compromising CapStone ≈ full Zoho API access. Fix: tighten Zoho scopes to
the minimum modules CapStone needs, rotate regularly, and consider per-technician OAuth later.

### 3.3 Medium

- **S10 — `picklist-request.js`** sends email via `RESEND_API_KEY` with **no auth** and reflects
  user-supplied subject/body → spam/cost abuse. **[cursor]**
- **S11 — `transcript-ready.js`** webhook has no signature/shared-secret check; forgeable
  (low direct impact). **[cursor]**
- **S12 — `plaud-proxy.js`** has no app secret and open CORS; relays caller-supplied Plaud tokens.
  **[cursor]**
- **S13 — CORS conflict.** `netlify.toml` sets `Access-Control-Allow-Origin: *` globally for `/*`,
  fighting the per-origin allowlist the v357 proxy now uses. **[cursor]**
- **S14 — No rate limiting or alerting** on any function — amplifies every cost-abuse vector. **[both]**
  (Grok listed rate limits as part of the minimum proxy fix.)
- **S15 — Client-side XSS surface. [cursor]** `esc()` escapes only `& < >`, not quotes, while several
  templates interpolate Zoho/user values into `onclick='..."+esc(id)+"'"` attributes and the report
  photo grid injects `p.display`/`p.time` into HTML strings. A malicious deal/asset name or photo
  label could break out. Grok's **Content-Security-Policy** recommendation (S16) is the second layer
  of defense here.
- **S16 — No Content-Security-Policy. [grok]** Add a CSP to block unexpected script origins (limits
  the blast radius of any XSS and of the direct-browser AI calls).
- **S17 — Upload actions decode `*_b64` with no size cap** (`upload_photo`, `upload_deal_attachment`,
  `upload_equipment_photo`, `workdrive_upload`) → memory-pressure DoS. **[cursor]**
- **S18 — Error/config leakage** — outer catches return raw `err.message`; some WorkDrive paths
  return response snippets in a `debug` field. **[cursor]**

### 3.4 Low

- **S19 — API keys / proxy secret / WorkDrive folder in public JS or `localStorage`.** Standard for a
  static SPA but worth noting (`WORKDRIVE_FOLDER`, `src/app.js:8`; `fp_api_key` etc.). **[both]**
- **S20 — Stale root duplicates** (`app.js`, `zoho-proxy.js`) invite deploying the wrong file — both
  reviews flag this; Grok frames it as a security/deploy hygiene item too. **[both]**

---

## 4. Reliability review (in and out of service areas)

Both reviews agree the offline *data* design is strong; the gaps are the app *shell* and a few
data-loss edges.

### 4.1 High

**R1 — No service worker / PWA manifest. [both]** This was independently the #1 reliability item in
*both* reviews. `FieldPro.html` is served `no-cache, no-store`, jsPDF and fonts are CDN-loaded, so a
cold load with no signal can't boot the app. Add a service worker + manifest to precache the app
shell (HTML/JS/CSS) and self-host jsPDF/fonts so the app opens — and PDFs export — with a dead tower.

**R2 — Corrupt `fp_history` silently empties History. [cursor]** `getHistory()` catches a JSON parse
error and returns `[]` without quarantining the bad blob, so the next save can overwrite remaining
data. History isn't re-fetchable, unlike the deal cache.

**R3 — Quota pressure can drop History to 5 (or 3) records or strip photo metadata. [cursor]**
`persistHistoryRecords` triages under storage pressure — silent loss of older visits on a full
device. (Grok's deal-cache prune, R6, reduces the pressure that triggers this.)

### 4.2 Medium

- **R4 — Explicit Field / Offline mode. [grok]** When signal is "fake-online," the app still attempts
  network calls and eats timeouts/battery. Add a mode that skips network attempts and only queues.
- **R5 — Duplicate Zoho submissions on retry. [cursor]** Asset/deal notes always `save_note` with no
  idempotency marker; a retry after an unseen success creates a duplicate. `uploadPendingReportNote`
  doesn't persist the returned `note_id` back into the queue on success. No dedup for
  `deal_asset_link` / `equipment_note` / `deal_asset_note`.
- **R6 — Deal-cache TTL / prune. [grok]** Large `fp_deals` is a known storage killer; auto-trim
  old/stale deals to reduce quota pressure (feeds R3).
- **R7 — Offline conflict clarity on asset updates. [grok]** If two techs update the same equipment
  offline, define last-write-wins vs. "reload before save" — today the behavior is undefined.
- **R8 — Background Sync (when Chrome supports it). [grok]** Retry Pending Sync even when CapStone
  isn't open.
- **R9 — CDN dependency for PDF output. [cursor]** jsPDF from CDN means PDF export fails in the field
  if the CDN is unreachable (solved together with R1 by self-hosting).
- **R10 — Fragile version/update model. [cursor]** `FP_VERSION` + three `?v=` cache-bust strings must
  be hand-aligned; the update check fetches the entire `src/app.js` from raw GitHub.

### 4.3 Low

- **R11 — Storage warning is a rough UTF-16 estimate. [cursor]**
- **R12 — Many app-wide timers** (transcript poll 8 s, pending retry 120 s, Plaud pull, inbox poll)
  add up to background battery use. **[cursor]**

---

## 5. Efficiency review

Both reviews agree `src/app.js` is the root risk: ~8,500 lines / ~550 KB / ~800 functions, so every
change is high-risk. Grok's guidance — **digest, don't big-bang rewrite** — is the right framing.

- **E1 — Deals list fully rebuilds on every search keystroke. [cursor]** Debounce input; render
  incrementally (diff or windowed list).
- **E2 — Full-array JSON I/O for History. [cursor]** Every `getHistory()` re-parses `fp_history`
  (~22 call sites); every save re-stringifies the whole array. Add an in-memory cache invalidated on
  write.
- **E3 — Photo compression before store/upload. [grok]** Cuts IndexedDB pressure and WorkDrive
  failures on weak LTE (also reduces E4 payloads and R3 quota pressure).
- **E4 — Base64-in-JSON uploads. [cursor]** ~33% larger than binary; heavier on the 2 MB video path.
- **E5 — Batch Zoho reads where possible. [grok]** Map + deals + accounts still fan out into separate
  requests.
- **E6 — Server-side AI proxy reduces browser retries. [grok]** One place for rate-limit handling and
  Gemini model discovery (overlaps S8; a security *and* efficiency win).
- **E7 — Heavy startup. [cursor]** IDB init → cache parse → RBAC → history/deals render → draft
  timers → pending retries → key-sync pull → org policy → Plaud/inbox timers, plus an optional
  full-`app.js` fetch. Defer non-critical work until after first paint.
- **E8 — 66 `innerHTML` rebuilds** across panels; several rebuild whole lists. **[cursor]**

---

## 6. Architecture & maintainability

- **A1 — One ~8,500-line `src/app.js`** with a single mega-state object and ~87 `window.*` exports,
  no modules/bundler. Root cause behind the duplication/XSS/idempotency issues above. **[both]**
- **A2 — Grok's suggested digest order (no big-bang rewrite): [grok]**
  1. Extract the **sync layer** (Pending Upload/AI, Zoho token, `fetchWithTimeout`) → `src/sync.js`.
  2. Extract **Assets** (category layouts + the Zoho save sequence — the most complex path).
  3. Extract **Capture + Report** (media, History, AI report).
  4. Add a **server-side AI proxy** (fewer browser retries, one rate-limit place).
  5. Stop dual-maintaining root `app.js` / `zoho-proxy.js`.
- **A3 — Stale duplicate `app.js` at the repo root** (`FP_VERSION 322`). `FieldPro.html` only loads
  `src/app.js?v=357`, so the root copy is dead weight and an "edited/deployed the wrong file" trap.
  The root `zoho-proxy.js` is a labeled stub — leave it or document it. **[both]**
- **A4 — Committed binaries/spreadsheets** (`all fileds.xlsx`, `flow meter.xlsx`, a screenshot,
  `self_client (3).json`) bloat the repo; the JSON is also the S2 secret leak. **[cursor]**
- **A5 — Inline HTML event handlers** couple the shell to globals and force the string-concat
  templating behind S15. **[cursor]**

---

## 7. Unified roadmap

Ordered by value-to-risk, as focused PRs matching the project's small-PR rhythm. Both reviews
produced the *same top-level ordering* (lock down Zoho → offline shell → thin the monolith); this
merges their specifics.

### Phase 0 — Contain the live Zoho exposure (do first)

| # | Action | Addresses |
|---|--------|-----------|
| 0.1 | **Finish the v357 Netlify deploy** — set `CAPSTONE_APP_SECRET`, Clear cache & deploy, verify Check Zoho Proxy. *Required or Zoho breaks.* | v357 rollout |
| 0.2 | **Replace the public app secret with short-lived device/session tokens** (issued after technician + passphrase), so a copied constant no longer grants access. | S1 |
| 0.3 | **Rotate the Zoho OAuth client secret + refresh token**, set only in Netlify env; purge `self_client (3).json` (and the xlsx/screenshot) from the tree and scrub history (`git filter-repo`). | S2, S9, A4 |
| 0.4 | **Authenticate or disable the open functions** (`submit-recording`, `get-transcript`, `picklist-request`, `plaud-proxy`); allowlist or drop arbitrary `audio_url`. | S3, S10, S12 |
| 0.5 | **Remove or hard-gate `delete_equipment`** with a real server-side admin check. | S4 |
| 0.6 | **Tighten Zoho scopes** to the minimum modules CapStone uses. | S9 |

### Phase 1 — Harden the proxy & client surface

| # | Action | Addresses |
|---|--------|-----------|
| 1.1 | Allowlist `crm_module` / `module_api_name`; URL-encode every path segment. | S5 |
| 1.2 | Per-IP / per-token rate limiting + basic abuse logging on all functions. | S14 |
| 1.3 | Cap decoded upload sizes on all `*_b64` actions; sanitize multipart `filename`. | S17 |
| 1.4 | Stop leaking raw errors / `debug` snippets; generic client messages, detail logged server-side. | S18 |
| 1.5 | Remove the global `Access-Control-Allow-Origin: *` from `netlify.toml`; rely on the proxy allowlist. | S13 |
| 1.6 | Key Sync: require proof of the prior passphrase (or a signed token) on `push`; raise min length; fix the policy first-writer bootstrap; replace `fpSimpleHash` with a real KDF and stop distributing the PIN hash. | S6, S7 |
| 1.7 | Add a **Content-Security-Policy**; escape quotes in `esc()` (or move to DOM/`textContent` templating) everywhere Zoho/user data enters an attribute or HTML string. | S15, S16 |
| 1.8 | **Move Anthropic/Gemini calls behind a Netlify function**; keep raw keys off the page (Key Sync distributes encrypted config only). | S8, E6 |

### Phase 2 — Close the field data-loss & offline edges

| # | Action | Addresses |
|---|--------|-----------|
| 2.1 | **Service worker + web manifest** — precache the app shell (HTML/JS/CSS), self-host jsPDF/fonts so the app opens and PDFs export fully offline. *(Both reviews' #1 reliability item.)* | R1, R9 |
| 2.2 | **Quarantine corrupt `fp_history`** — back up the bad blob, surface a recovery message, never overwrite blindly. | R2 |
| 2.3 | **Non-destructive quota triage** — push overflow to IndexedDB / export prompt instead of deleting older visits; add **deal-cache TTL/prune**. | R3, R6 |
| 2.4 | **Idempotent sync** — client-generated dedup key on note/link actions; persist returned `note_id`s on success. | R5 |
| 2.5 | **Explicit Field/Offline mode** — skip network attempts and only queue when signal is unreliable. | R4 |
| 2.6 | **Offline conflict policy** for concurrent asset updates (define last-write-wins vs. reload-before-save). | R7 |
| 2.7 | **Background Sync** where supported. | R8 |

### Phase 3 — Efficiency & maintainability (digest, don't rewrite)

| # | Action | Addresses |
|---|--------|-----------|
| 3.1 | **Photo compression** before store/upload. | E3, R3 |
| 3.2 | Debounce Deals search + incremental render; in-memory History cache. | E1, E2 |
| 3.3 | Delete the stale root `app.js`; guard/test that only `src/app.js` loads. | A3, S20 |
| 3.4 | Defer non-critical startup work; cheaper update check (version endpoint, not full-file fetch). | E7, R10 |
| 3.5 | **Extract the sync layer** → `src/sync.js` (Grok digest step 1). | A1, A2 |
| 3.6 | **Extract Assets** (category layouts + save sequence). | A1, A2 |
| 3.7 | **Extract Capture + Report.** | A1, A2 |
| 3.8 | Batch Zoho reads where possible. | E5 |

### Phase 4 — Product / process (after the above)

| # | Action | Addresses |
|---|--------|-----------|
| 4.1 | **Server-enforced RBAC (Phase 3)** — the proxy checks role/capability; finish before expanding admin powers (delete asset, clear queues). | S4, S7 |
| 4.2 | Unified "what saved / what queued / what failed" summary after Save to Zoho. | UX |
| 4.3 | Training video once the field workflow is stable; hold Plaud RAG / native app until proxy auth + PWA are done. | roadmap |

---

## 8. Where the two reviews agreed and diverged

- **Both, independently:** lock down the Zoho proxy first; add a service worker/PWA for offline app
  load; thin the `src/app.js` monolith; server-enforce RBAC; drop stale root duplicates; no rate
  limiting today.
- **Grok added (Cursor underweighted):** AI keys should move server-side (S8); Content-Security-
  Policy (S16); photo compression (E3); deal-cache prune (R6); explicit offline mode (R4); offline
  conflict policy (R7); background sync (R8); "device/session tokens" as the real fix for the public
  secret (0.2); minimize Zoho scopes (S9). Grok also **shipped the first fix** (PR #246).
- **Cursor added (Grok didn't cover):** the committed Zoho `client_secret` in `self_client (3).json`
  (S2); the other unauthenticated functions `submit-recording`/`get-transcript`/`picklist-request`/
  `plaud-proxy` (S3, S10, S12); `delete_equipment` exposure (S4); client-controlled module path (S5);
  Key Sync `push` overwrite (S6); weak PIN hash / open `policy_pull` (S7); XSS quote-escaping gap
  (S15); upload size caps (S17); error leakage (S18); `fp_history` corruption/quota data loss
  (R2, R3); duplicate-submission risk (R5).
- **No direct contradictions.** The one thing to keep straight: Grok's *original* top finding (open
  `refresh_token`) is **already fixed** in v357; S1 is the *residual* of that fix (public secret),
  not a regression.

---

## 9. Verification performed for this review

- `node --check src/app.js` — passes.
- `node --check` on all seven `netlify/functions/*.js` — passes.
- `git diff --check` — clean.
- `git ls-files` confirms `self_client (3).json` is tracked (S2); `git log` traces it to commit
  `e4d53dc`.
- v357 lockdown confirmed in `netlify/functions/zoho-proxy.js` (`assertAppSecret`, per-origin CORS,
  server-side token) and PR #246.
- All findings are static-analysis based (reading code + repo state). No live
  Zoho/AssemblyAI/Resend calls were made, so exploit *feasibility* is described from the code, not
  demonstrated against production.
