# CapStone Development Rules

These rules apply to all future CapStone program changes, including bug fixes, new features, new tabs, Zoho changes, WorkDrive changes, UI changes, and reliability improvements.

The goal is to make sure CapStone stays consistent as it grows.

## Core rule

Every change must be reviewed against the whole program, not only the screen being edited.

When a new behavior is added to one part of CapStone, ask whether the same behavior or pattern should also apply to:

- Deals
- Capture
- Assets
- Report
- History
- Settings
- Pending Sync
- README / training docs
- future tabs and future workflows

## Future tab rule

Any new tab or major screen must include:

- a workflow card near the top
- active context if applicable
- clear primary action
- clear save/update state
- visible warnings/errors
- pending sync behavior if it writes to Zoho, WorkDrive, or another service
- local draft/recovery behavior if the user can enter meaningful field data
- **field auto-advance** on every editable input and picklist (see Field auto-advance rules)
- matching button and card styling
- documentation updates

Do not add a new tab as a one-off design. New tabs should feel like the existing Capture and Assets workflows.

For the planned **Inbox** tab (Plaud Note Pro / unassigned voice), read `docs/PLAUD_INTEGRATION.md` before implementation.

## Consistency checklist for every PR

Before a PR is considered complete, check:

1. Does this change affect Capture?
2. Does this change affect Assets?
3. Does this change affect Inbox?
4. Does this change affect Report?
5. Does this change affect Deals?
6. Does this change affect History?
7. Does this change affect Settings?
8. Does this change need Pending Sync support?
9. Does this change need local draft/recovery support?
10. Does this change need a status badge, warning, or confirmation?
11. Does this change need README or training documentation updates?
12. Does this change need a version bump and cache-busting update?
13. Does this change need a backup branch before work begins?

## Backup rules

Create a backup branch before:

- large refactors
- major structure changes
- authentication/backend changes
- database changes
- multi-user changes
- large UI reorganizations
- risky Zoho module changes
- WorkDrive folder/file behavior changes

Backup branch naming pattern:

```text
cursor/<description>-backup-7ea5
```

Feature branch naming pattern:

```text
cursor/<description>-7ea5
```

## Local storage rules (History and captured media)

History is the technician's only copy of a visit until Zoho and WorkDrive have
it, so freeing space must never be the thing that loses it.

- **Never discard data before a write has failed.** Trimming, stripping, and
  truncation run only after `localStorage.setItem` actually throws — not because
  a usage estimate crossed a threshold. `getStorageSize()` counts every
  `fp_*` key (the cached deal list is usually the largest), so a "storage is
  getting full" reading says nothing about whether this particular write fits.
- **Never drop bytes that exist in only one place.** Photo/video bytes may be
  removed from a History record only once IndexedDB is confirmed to hold that
  id (`fpIdbIsPersisted()`); otherwise they stay inline. `initPhotoStore()`
  loads the store's existing keys so this check is accurate at boot.
- **Give up the least valuable thing first.** Escalate in order: bytes already
  duplicated in IndexedDB, then remaining image bytes, then whole reports. The
  record currently being written keeps its own photos at every step.
- **Say what was lost.** Dropping reports or failing to restore photos gets a
  visible message. Blank images, silently shorter History lists, and photo
  counts that do not match what opens are all bugs.
- Prefer moving bytes into IndexedDB (`migrateHistoryPhotosToIdb()`) over
  deleting them.

## Naming rules

The program should be called:

```text
CapStone
```

Avoid using:

- Field Pro
- FieldPro as the product name
- fieldpro except when referring to the GitHub Pages URL path or repository path

## Version and cache rules

When changing app behavior or UI:

- bump `FP_VERSION`
- update the displayed header version
- update Settings version display
- update script/style cache-busting query strings when external files change

Example:

```text
FieldPro.html?v=180
src/app.js?v=180
src/styles.css?v=180
```

Docs-only changes do not need app version bumps.

## UI style rules

Use consistent CapStone patterns:

- white cards for primary data entry and review areas
- light red for missing required fields or warning badges
- green for success/saved states
- amber/teal for primary action emphasis
- consistent `Saved`, `Pending`, `Retry`, `Update`, and `Save to Zoho` language
- workflow cards for guided processes

Avoid introducing one-off colors or button styles unless there is a clear reason.

Standard button classes (always pair with `.bsm` or `-lg` size as needed):

| Class | Use |
|-------|-----|
| `.bp` / `.bp-lg` | Amber — primary emphasis (Save to Zoho, View, Link to Deal) |
| `.bb` / `.bb-lg` | Teal — primary workflow (Add Photos, Snap, Search, Use Active Deal, Update Photos on This Report) |
| `.bs` / `.bs-lg` | Green — success / generate / save actions |
| `.bg` / `.bg-lg` | Secondary — neutral actions on a **dark** surface (Edit, Cancel, PICK DEAL in bars, → AI on Capture) |
| `.bw` / `.bw-lg` | Secondary — the same neutral actions on a **white or light card** (Download PDF, Regenerate Report, the Report Copy Name choices on Report, Retry File Sync, Refresh deals / Change deal, Inbox CHANGE) |
| `.bd` / `.bd-lg` | Red — remove / delete |
| `.bsm` | Small padding modifier |
| `.bfull` | Full width |

Do not use undefined classes (e.g. `.bb` without a matching rule) or `.bg-lg` for primary tab entry actions — use `.bb-lg` or `.bs-lg` instead.

**A neutral secondary button must match the surface it sits on.** `.bg` / `.bg-lg` are dark
(`var(--card)` / `#1a2a3a`), so on a white card — the whole Report tab, `.pdf-opts`,
`.workflow-card`, `.report-save-checklist`, `.report-retry-actions`, `.asset-setup-card`,
`.asset-setup-context`, the Inbox deal bar — they read as **black boxes**. Use `.bw` / `.bw-lg`
there rather than a one-off id override.

**Day / night:** Capture, History, and Deals cards are dark at night and white in day mode
(`body.light .card`). A `.bg` / `.bg-lg` control on those cards must look like `.bw` in day
mode — `body.light .card .bg` (and the matching History card rule) apply the white/teal
treatment so a theme toggle does not leave navy slabs on a white Capture card. Photo and
video cards (`.pcard`) follow the parent card. Report cards, `.workflow-card`,
`.asset-setup-card`, and the other always-white surfaces stay light in both themes and keep
`.bw`. A dark full-width `.bg-lg` is right for a utility action on a dark pane at night
(Pause, Save Video to Downloads, Save All Photos to Phone); in day mode the same controls
sit on a white card and take the `.bw` treatment. A step in the report workflow needs a
colour that says so — **Update Photos on This Report** is `.bb-lg` teal like **Add Photos**,
the action that leads into it, rather than a dark slab between the amber and green actions
around it. When one control renders on both a dark and a white surface — the Report Copy
Name picker appears on Capture and on Report — choose the class from the scope **and the
theme** (`surfaceNeutralClass()`): Report is always `.bw`; Capture is `.bg` at night and
`.bw` in day. Anything that rewrites a button's `className` at runtime (`dlPDF()` restoring
**Download PDF**) has to restore the same class.

## Button processing feedback rules

Every interactive button in CapStone must give clear feedback when the user taps it:

- **Pressed state** — on press, apply the shared `.btn-armed` styling (darker/pressed background via `filter: brightness` and slight scale). This applies to all `button` elements and `label.fbtn` file-picker buttons.
- **Processing state** — while a network request or other async work is in progress, show a **spinner on the button** (`.is-busy`) and disable the button so it cannot be double-tapped.
- **Global indicator** — the header **Processing…** badge (`#fp-global-busy`) must appear whenever `fetchWithTimeout` has an active request anywhere in the app.
- **Implementation** — use the shared helpers in `src/app.js`: `initButtonFeedback()` (wired in `bootApp()`), `fetchWithTimeout()` (increments/decrements global busy count), `wrapAction()` + `installActionWrappers()` for all onclick/async handlers, and `withBusy(element, fn)` for async work that does not go through `fetchWithTimeout`.
- **Opt out** — only use `data-no-busy` on controls that should never show button busy state (rare; document why in the PR).
- **New buttons** — any new button added to any tab must work with this system automatically; do not add one-off spinners unless there is a documented exception.

Going forward, a PR that adds buttons without visible processing feedback should not be considered complete.

## Scroll position preservation rules

When CapStone re-renders part of the screen after a user action (checklist updates, category fields, picklist panel, setup cards, etc.), the viewport must **not jump away** from where the user was working.

- **Remember before DOM updates** — call `fpRememberView()` before replacing `innerHTML` or other layout-changing updates.
- **Restore after paint** — call `fpRestoreView()` (or use `fpAfterDomUpdate(fn)` which wraps both) after the DOM update so scroll position and focus return to the last interaction.
- **Do not auto-scroll** on validation toasts or incidental status updates unless the user explicitly navigated to a new tab/step.
- **New re-render paths** — any new dynamic panel or checklist must use the shared helpers; do not call `scrollIntoView` or `window.scrollTo(0,0)` after inline edits without user intent.

## Tab draft persistence rules

Every CapStone tab that collects user work must **autosave draft state** so switching tabs, backgrounding the app, or refreshing does not lose in-progress data.

- **Capture** — `fp_capture_draft` in `localStorage` + History backup on visibility change.
- **Assets** — `fp_asset_draft` in `localStorage`; includes form fields, photos/labels, category dynamic values, subform rows, intent/mode, and deal/account context.
- **On tab switch** — `go()` calls `saveCaptureDraftNow()` / `saveAssetDraftNow()` when that tab has work in progress.
- **On background / page hide** — save capture + asset drafts (capture also writes History when possible).
- **On cold start** — offer restore via confirm dialog (`maybeRestoreCaptureDraft`, `maybeRestoreAssetDraft`).
- **New tabs** — add `build*Draft`, `save*DraftNow`, `schedule*DraftSave`, `*DraftHasWork`, and wire into `go()` + visibility/pagehide. Document the storage key in this section.

## Field auto-advance rules (all tabs)

Speed data entry on mobile by moving focus to the next visible field after the user completes the current one. This is a **program-wide standard** — every tab with form fields must use the shared helpers, including any tab added in the future.

- **Picklists / selects** — after a non-empty value is chosen (`change`), focus advances to the next field.
- **Text / number inputs** — press **Enter** to advance (blur alone does not advance — avoids fighting tap-to-next-field on Android).
- **Textareas** — no auto-advance by default (multi-line notes, Wispr dictation). Opt in with `data-auto-advance="enter"` (Enter without Shift advances; Shift+Enter keeps a new line).
- **Skip fields** — set `data-no-auto-advance` on search boxes, filters, or other fields that should not chain (e.g. asset search).
- **Order** — DOM order within the active tab pane, or within an open modal when a modal is on screen (modals take priority over the tab behind them).
- **Visibility** — skip hidden, disabled, and readonly fields; only advance to visible, enabled inputs.
- **Implementation** — `installAutoAdvanceInRoot()` / `installAutoAdvanceAll()` in `src/app.js`; called from `initNoAutofill()` (dynamic panels), `bootApp()`, and `go()` after tab switches. Re-bind after any `innerHTML` re-render that replaces form nodes. Use `focus({ preventScroll: true })` so auto-advance does not fight scroll preservation rules.
- **New tabs with forms** — wire auto-advance on boot and after dynamic renders; document any intentional exceptions in this section.

## Autofill / credential prompt rules

CapStone fields are instrument data, not login forms. Prevent browsers from offering username/password autofill:

- Run `initNoAutofill()` at boot and on dynamically rendered asset category fields.
- Set `autocomplete="off"`, `data-form-type="other"`, and non-login `name` attributes on inputs, textareas, and selects.
- Generated `name` attributes must never contain credential-heuristic tokens (`name`, `user`, `pass`, `login`, `email`) — browsers ignore `autocomplete="off"` on fields that look like login fields. `sanitizeNoAutofillName()` in `src/app.js` rewrites these tokens (e.g. `asset-name` → `name="fp-nm"`); route any new generated names through it.
- Every `type="password"` input (admin PIN, policy/sync passphrases, API keys) must sit inside its own `<form autocomplete="off" onsubmit="return false">` wrapper. Fields outside a `<form>` are grouped by the browser into one page-wide synthetic form; a bare password input there pairs with name-like text fields (e.g. Asset Name) and triggers "Use name and password" credential prompts on the Assets form.
- Do not force `autocomplete="off"` onto `type="password"` inputs — browsers ignore it and fall back to saved-login heuristics. Keep the markup value (`new-password` or `off`); `initNoAutofill()` preserves it.
- Use the readonly-on-focus trick for editable text fields where mobile browsers still prompt credentials.

## Zoho search API rules

When searching Zoho CRM modules (especially `Equipments`):

- The Search API `fields` parameter is limited to **50 fields**. Exceeding this returns `LIMIT_EXCEEDED` and **zero results** — always count fields before adding new ones to search requests.
- Valid search operators are `equals`, `starts_with`, `in`, `not_equal`, comparisons, and `between`. **`contains` is invalid** and returns `INVALID_QUERY`.
- For text fields, `equals` behaves like a contains match in Zoho Search API.
- Prefer **`word` search** (`/crm/v3/{module}/search?word=...`) for AMD/CAC IDs and other global lookup terms.
- COQL requires a separate OAuth scope; do not rely on COQL unless token scopes include it.

## Required field rules

If a field is required:

- mark it visibly
- block save until complete
- highlight missing required fields
- show a clear message listing missing fields

If this behavior is added to one form, consider whether other forms need the same pattern.

## Save/update behavior rules

For any save to Zoho:

- avoid duplicate records when possible
- update existing records when that is the intended workflow
- store returned Zoho IDs when possible
- recover if a stored ID was deleted or is stale
- create notes/history when useful
- preserve user-entered context
- show success/failure status

### Changing one part of a finished report

A report is reviewed before it is issued, so its wording is user-approved
content even though an AI wrote it. Changing something else about the report
must not silently rewrite it.

- If only attachments changed (photos, videos), offer an action that updates
  those and leaves `A.report` untouched. `updateReportPhotos()` is the pattern.
- Regeneration is opt-in and clearly labelled as rewriting the text.
- Existing per-item AI text (photo Observation, Synthesis) is kept when that
  item is unchanged; only new items get fresh AI notes (`addAiPhotoNotes()`
  with `onlyMissing`).
- Say what will change before doing it. Describe the actual delta ("3 → 3
  (1 added, 1 removed)"), not just a count, so a swap does not read as a no-op.
- Anything that changes what the report contains marks `A.dealPdfStale` so the
  next save replaces the copy attached to the Deal rather than leaving a stale
  PDF behind.

## Pending Sync rules

Any operation that writes to Zoho, WorkDrive, or another external service should be evaluated for Pending Sync.

Examples:

- Zoho report notes
- Zoho asset records
- Zoho asset notes
- Deal asset subform links
- WorkDrive files
- Deal PDF attachments
- asset photo attachments

If a failure can happen because of weak field service connection, strongly consider queueing it.

Pending Sync items should:

- be saved locally
- show in Settings
- show in the Pending badge
- retry automatically
- allow manual retry
- show attempts/errors
- be removable/clearable when needed

## Draft/recovery rules

If a workflow has meaningful user-entered data, evaluate draft autosave.

Current examples:

- Capture/Report draft autosave exists.
- Asset form draft autosave and restore exists.

Future candidates:

- future new tabs with field data
- offline report/asset sessions beyond local History

Drafts should:

- save locally
- restore after reload
- show visible draft status
- clear after successful save or intentional reset

## Zoho rules

When working with Zoho:

- use exact API names
- use exact picklist `actual_value` strings
- do not assume labels are API names
- preserve lookup IDs
- avoid overwriting subforms without first reading existing rows
- avoid duplicate subform rows
- keep notes/history where updates matter

For assets:

- `Equipments` is the module API name
- asset history should stay tied to the permanent asset record
- Deals can reference assets through `Assets_and_Checklist`
- `Assets` is the lookup field in that subform

### Asset category Zoho layout rules (all categories)

This applies to **every** `Asset_Category` value — current and future (Flow Meter, Flow Open Channel, Gas Detector, General, Lift Station, Scales & Balances, and any category added later).

Zoho CRM layout rules control which sections and fields appear on the Equipments record. CapStone must activate that layout on save so technicians do not have to open Zoho and reselect the category manually.

**Zoho API limitation:** v8 `layout_rules` via API only supports the **Set Mandatory Field** action. **Show Section / Show Field** rules do not run through the API alone. CapStone works around this by simulating a category change in Zoho, then saving again with the category included — the same effect as reselecting the category in the Zoho UI and clicking Save.

**Required save sequence** (implemented in `saveEquipmentRecord()` — do not bypass or special-case individual categories):

1. Save **core fields only** — omit `Asset_Category` and all category-specific fields from the first create/update payload.
2. **Activate layout** via Netlify proxy `activate_equipment_category_layout` — **initial pass** (pause, category-only temp swap + double reselect when category unchanged, then extension fields), then **reopen confirm pass** after a longer wait (read record again, pause, temp swap + double reselect, full resave with category + fields) to mimic manual Zoho pause → reopen → click Asset Category → select same value again → Save.

**When adding a new asset category to CapStone:**

- Add the category to `categoryLayouts` in `src/config/zohoEquipmentFields.json` with sections and field registry keys.
- Use exact Zoho picklist `actual_value` strings for `Asset_Category`.
- Reuse the existing save path — **do not** add category-specific save logic unless Zoho documents a different requirement.
- Verify in Zoho CRM after CapStone save: conditional sections appear **without** manually changing the category dropdown.
- Ensure Netlify `zoho-proxy.js` is deployed — layout activation uses server-side `activate_equipment_category_layout` (v8 `layout_rules` on temp + target, then v3 persist).

**CapStone UI:** category-specific fields render from `categoryLayouts` via `syncAssetCategoryLayoutUi()` / `renderAssetCategoryFields()`. Always load equipment config before rendering category sections. **Layout visibility depends on Asset Category only** — Brand and Series affect conditional suggested defaults (e.g. Pulsar Ultra 4) but must never hide or gate the category layout; brand/series changes update defaults in place without tearing down the rendered layout.

**Category suggested defaults:** `categorySuggestedDefaults` in `src/config/zohoEquipmentFields.json` defines per-category default values for empty category layout fields. CapStone **auto-fills** these when Asset Category is selected and rules match (including after AI extract sets Brand/Series). **Flow Open Channel:** Display Engineering Units → GPM US; Set Up Input Engineering Units → H2O Inches; Set Up Output Engineering Units → 4-20 mA; **Duration** → 0.75 (separate from **Damping Seconds**). **Flow Meter:** Display GPM US; Set Up Input Engineering Units → GPM US; Set Up Output 4-20 mA; Duration → 0.75. **Input/Output PV Zero/Span Parameter fields** (Empty_Parameter_1, Span_Parameter_1, Output_PV_Zero_Parameter_1, Output_PV_Span_Parameter_1) are layout-visible only for **Flow Open Channel** — not Flow Meter or General. **When Brand = Pulsar and Series = Ultra 4 (Flow Open Channel only):** Input PV Zero Parameter → P005; Input PV Span Parameter → P006; Output PV Zero Parameter → P838; Output PV Span Parameter → P839. Re-applies when Brand/Series change, after AI extract, and after engineering-unit lookups finish loading. User-edited values are not overwritten.

**Optional reminder fields:** Some category fields (e.g. Date Installed) use light-red styling when empty but do **not** block save — technicians can save without them when not applicable.

**Do not:**

- Set `Asset_Category` in the first create/update payload together with core fields (layout will not activate).
- Assume `layout_rules` alone will show/hide sections in Zoho.
- Ship a new category without a Zoho layout verification step on a real Equipments record.

## WorkDrive rules

When working with WorkDrive:

- prefer stable filenames for repeated saves
- avoid timestamp duplicates unless intentionally versioning
- queue failed uploads
- use clear filenames with report ID, asset number, or short description where possible
- keep WorkDrive links in Zoho notes when relevant

## Report copy name rules

A visit can be issued as more than one report copy (customer, internal, or a name the technician types). The copy name is what keeps those copies apart:

- The name comes from `reportCopyLabel()` — presets in `REPORT_COPY_TYPES` plus a typed name for `Other`, remembered per device in `fp_report_copy`.
- `Other` is a required field: block Generate / Download PDF and highlight the input until it is named.
- Any new place a report is filed or titled must include the copy name: `workdrivePdfFileName()` (WorkDrive file and Deal attachment), `reportPdfFileName()` (local download), `zohoNoteTitle()`, note/share text, on-screen header, History.
- Same copy name = replace (WorkDrive overrides by name; the Deal PDF is deleted through `delete_deal_attachment` then re-attached). Different copy name = file alongside. Never stack copies of the same name.
- Store `copyType`, `copyLabel`, and `dealPdfAttachments` on the History record and Capture draft so reopening a project keeps replace-instead-of-duplicate behavior. Records saved before copy names existed keep their unlabeled filenames.

## Copy visit to other deals

One History record stays one deal. Filing the same visit on another deal (or several) is a **copy**, not a shared record:

- **Copy to Other Deals** (Capture, Report, History, and the Active Deal card) opens the deal picker in multi-select. The source deal is marked *This visit* and cannot be selected again.
- Each target gets a new History id, its own deal fields, and a `copiedFromId` back to the original. Zoho note id, Deal PDF attachments, and WorkDrive PDF URL are cleared so the next save files that deal instead of updating the first one.
- Photos and videos keep the same blob keys so a copy does not double storage. `permDeleteHist` and `clearOldPhotos` only delete a blob when no remaining record still shows it (`unreferencedHistoryBlobKeys()`).
- After the local copies are written, a visit that already has a report can be saved to Zoho on each target (note + Deal PDF + WorkDrive) in one pass. Failed saves queue in Pending Sync the same way a single-deal save does.
- The report text is copied as written. The PDF header uses the target deal name at render time. Regenerating a copy is optional and is the way to rewrite the body for that deal.
- Switching the active deal on the Deals tab while capture work is open still detaches `currentHistoryId` (next save is a new record) and now says so. Prefer **Copy to Other Deals** when the visit belongs on more than one deal.
- Any change to the clone or blob-refcount helpers must run `node tests/copy-capture-to-deals.js`.

## Report generation input rules

**Everything the technician typed on site has to reach the report body.** `generate()` builds one
prompt, and any capture field left out of it silently disappears from the report even though it is
still stored and still shown beside the photos:

- Voice notes, the video transcript, the ten report sections, **and the technician's per-photo
  descriptions** all go into the prompt. A photo description is field data, not a caption — the AI
  Observation and AI Synthesis are the model's own text and are not a substitute for what the
  technician wrote.
- Section 10 is a parts order, so the prompt tells the model to carry every part from the pre-filled
  section 10 into the report with its part number, quantity, and the deficiency it is for exactly as
  given, and never to invent, correct, or drop a part number or add a part it was not given.
- Only the first four photos are sent as images, so photo notes go in as text for **every** photo,
  independent of that image budget.
- The report body still must not describe photos or cite photo numbers. Fold the facts into the
  section they belong to instead.
- Any new capture field a technician can type into must be added to this prompt in the same PR —
  and, per the customer copy content rule, to the render-time filter.
- **The instrument's own identity goes into the prompt too.** The equipment this visit identified
  (`partsEquipmentLines()` — assets saved to Zoho Equipments plus the asset form still open) is added
  as `INSTRUMENTS DOCUMENTED ON THIS VISIT`, each value labeled the way the prompt asks the model to
  write one (`Model: …`, `Serial: …`). Without it the report could only name the equipment as loosely
  as the notes did — the model and serial the technician had already saved to Zoho never reached the
  report body. It is the same helper Parts Lookup reads, so the report and the parts list describe
  the instrument identically. The records are identity, not a work log: the prompt says so, so the
  model must not report work they do not describe.

**AI photo text belongs to the report photos, and Capture holds its own copy of each photo.**
`A.photos` (Capture) and `A.reportPhotos` (Report) are separate objects for the same photo, so
after `addAiPhotoNotes()` the observation and synthesis have to be handed back to `A.photos`.
Otherwise the next background History save — which describes the Capture tab — writes a leaner
copy of the same photo over the stored record and both AI blocks are gone. `mergeHistoryRecord()`
is the second line of defence: on a silent autosave it merges `photoData` per photo id and keeps
each photo's existing `desc`, `label`, `aiDesc`, and `synthesis` when the incoming copy has none.

## Customer copy content rule (applies to every capture, now and in future)

**A customer copy never contains equipment part numbers, model numbers, order numbers/order codes, serial numbers, or pricing of any kind.** A model number counts as a part number, and Endress+Hauser prints the same identifier as an order number / order code. This holds for every field the copy renders — the report body, the deal name in the header, the technician's photo description, and the AI Synthesis. Internal Copy and Other copies carry the full detail.

- The deal amount is out of the report entirely: the PDF header, on-screen Report header, Zoho note header, and the AI generation prompt must not carry `Amount` or any pricing. Deal amount stays on the Deals tab, where it helps pick the right deal.
- **Filter at render, never at capture.** One report is generated per visit and any copy can be rendered from it afterwards (including months later from History), so the technician must never lose captured detail to satisfy a customer copy. `buildPDF()` filters when `isCustomerCopyLabel(copyLabel)` is true, which covers every PDF path at once — local download, WorkDrive, Deal attachment, History export — and `buildReportExportText()` does the same for share/email/clipboard.
- **Withheld data leaves no words behind.** A customer copy must never carry a note where a value was — no `[not shown on customer copy]`, no `[withheld]`, no marker of any kind. The label goes with the value (a bare `Serial:` reads worse than no mention at all), and `closeCustomerCopyGaps()` closes the hole so the copy still reads as a finished report: `Chart recorder, Honeywell DR4500A, Serial: 6M-4471, panel LCP-3` renders as `Chart recorder, Honeywell, panel LCP-3`. Values listed together close as one gap, brackets and quotes that only held a value go with it, a separator that was only attaching the value goes when nothing follows it, a value set off by commas takes both commas *only when what follows continues the clause* — in a list the comma in front of the value belongs to the list, so `- Chart recorder, Honeywell, Model number: DR4500A, panel LCP-3` renders as `- Chart recorder, Honeywell, panel LCP-3` rather than fusing two items into `Honeywell panel LCP-3` — a determiner with nothing noun-like after it goes too (`Replace the MRC 7000 within 12 months` → `Replace within 12 months`), a value that ended a clause also takes the determiner and preposition it was hanging from (`Pen arm P/N 51404671-501 replaced on the DR4500A` → `Pen arm replaced`), a whole sentence going does not leave two periods, punctuation with nothing left in front of it goes with the value (`Parts: DR4500A. Also replaced chart paper.` → `Also replaced chart paper.`), a dash keeps its spacing but not when a bracketed aside is all that follows the value (`fits the Honeywell DR4500A — Part number: 24001660-001 (box of 100 charts)` → `fits the Honeywell (box of 100 charts)`), a value that opened a bracketed aside takes the separator behind it (`(Part number: 24001660-001; box of 100 charts)` → `(box of 100 charts)`), a sentence that lost its opening keeps its capital, and a line that was nothing but the value is dropped rather than left as an empty bullet. Each pass marks its removal with the `CUSTOMER_COPY_GAP` control character, which `redactCustomerCopyText()` always closes before returning — no path may return text still carrying it.
- **The document's own front matter says nothing about the filtering either.** A customer copy carried a note under the copy name in the PDF and a matching line in the shared text ("Customer copy — equipment part, model, order, and serial numbers and pricing are not included."), which disclosed in words exactly what closing the gaps exists to avoid. Both are gone, and `tests/customer-copy-redaction.js` reads `buildPDF()` and `buildReportExportText()` out of the source to keep them gone. The copy name itself stays: "Customer Copy" names the document, it does not describe what was taken out of it.
- **A section left with nothing in it goes with its heading.** A heading standing over a blank space tells the customer the report had content there, so when every line under a heading was dropped, `closeCustomerCopyEmptySections()` drops the heading too and closes the blank space it left. It only runs when a line was actually dropped — a report that arrived with an empty section keeps it, because that formatting is the AI's, not a removal. A heading with anything left under it, and the blank lines between sections, are untouched.
- **Wording that announces a removal is removed too.** The filter writes no placeholder, but the text it filters can arrive already carrying one: the generation prompts tell the model a customer copy withholds numbers, and a model sometimes writes the withholding instead of the number (`Serial: [redacted]`, `model number not shown on customer copy`, `Model: N/A`, `Part number: ***`). A technician can type the same. `redactCustomerCopyPlaceholders()` removes that wording the way a value is removed — the label, the wording, the brackets, and the punctuation holding it all go, marked with `CUSTOMER_COPY_GAP` so `closeCustomerCopyGaps()` closes the hole: `Model number: [redacted] on the chart recorder.` reads `On the chart recorder.` and `- Pen arm replaced (part number withheld on customer copy)` reads `- Pen arm replaced`. The word lists are deliberately split. `redacted`, `withheld`, `undisclosed`, `not shown`, `not disclosed`, and `confidential` never mean anything else in a field report, so they go wherever they appear, with or without a label. `removed`, `deleted`, `omitted`, `masked`, `hidden`, `excluded`, `suppressed`, `N/A`, `TBD`, `***`, and `---` are ordinary field words — a pen arm really is removed, a step really is omitted — so they only read as a placeholder inside brackets (`(N/A)`) or in the value slot after an identifier label written with its separator (`Serial: removed`). Requiring the separator is what keeps prose such as `pen arm part removed and replaced` and `Amount removed: 5 gallons` intact. The prompts also now forbid placeholders outright, which is the first line of defence; this pass is the second, because the model's output cannot be trusted to obey.
- **A customer copy prints one AI block per photo, the AI Synthesis.** The synthesis is already the technician's note and the AI Observation merged, so a copy carrying both says the same thing twice, and the raw observation is the wordier and more speculative of the two. `customerSafePhotos()` blanks `aiDesc` rather than filtering it, so every render path drops the block at once (PDF, on-screen Report tab, History export), and `renderReport()` leaves the on-screen block out for a customer copy so what the technician reviews is what is sent. The captured observation is never touched on the record and an Internal Copy still prints it. The synthesis prompt is told it is the only AI text a customer copy prints, so it has to stand on its own.
- **What went is shown to the technician, not to the customer.** Because the copy carries no marker, the Report tab is the only place the removal is visible: `customerCopyWithheldSummary()` returns both the count and the list of removed values (labels included, plus pricing) and `renderCustomerCopyNotice()` prints them, so a customer copy is still verifiable on screen before it is sent.
- **A label is not required.** Reports say "Replaced the Honeywell DR4500A chart recorder" as often as they say "Model: DR4500A", so `redactCustomerCopyBareCodes()` also withholds a code by shape: mixed letters and digits at least four characters long (`DR4500A`, `MRC7000`, `uR1800`, `3051S`, `FMU90-R11CA111AA3A`), a grouped numeric code (`51404671-501`, `24001660-001`), and a spaced model prefix plus code (`MRC 7000`) via `redactCustomerCopySpacedCodes()`. The same code typed in lower case is the same code (`dr4500a`, `mrc7000`): letters first and at least three digits, which is what keeps a reading typed the same way (`10am`, `45min`, `1500gpm`) out of it. An unlabeled code is simply lifted out of the sentence: `Replaced the Honeywell DR4500A chart recorder` reads `Replaced the Honeywell chart recorder`.
- **A 6+ digit number with no unit is a part or serial number.** After v393 the report prompt is given the instrument's identity and after v394 Parts Lookup writes replacement parts into section 10, so the AI writes those numbers into the service-report body without always labeling them — `Installed replacement 307575`, `Honeywell 51404671 pen arm`, `Chart paper 24001660 restocked`, `Recorder 12345678 calibrated`. Shape cannot hide behind a hyphen that was never typed: `51404671` and `51404671-501` are the same part. `redactCustomerCopyModelNumbers()` withholds a 6+ digit number unless it is a reading (`1284567 gallons`, `The meter read 1284567`) or a job label (`work order 1234567`). A plant word in front of a long number is not a reference — `cell 2` is a place, `cell 066800` is a replacement cell — and `in` after a long number is the preposition (`066800, in the detector`), not inches. `Replacement` and `Spare` also count as identifier labels, a model variant with a short suffix (`Fisher 667-4`) goes when a brand or equipment noun stands beside it, and a series-letter model (`Promag P 300`) is the same identifier as `Promag 400`. Counts stay (`Ordered 12 pen assemblies`); the part-context words only look behind the number.
- **A model number is often a plain number, and the equipment beside it is what identifies it.** `Rosemount 3051`, `Promag 400`, `Fisher 667`, `Micro Motion 2700`, `Masoneilan 21000`, and `Signet 2551` are model numbers whose number is not code-shaped at all — `3051` and `1350 GPM` are the same shape — so no shape rule can tell them from a reading. `redactCustomerCopyModelNumbers()` uses the second signal the sentence already carries: an equipment noun (`CUSTOMER_COPY_EQUIPMENT_NOUNS` — transmitter, recorder, meter, analyzer, valve, actuator, probe, pump, …, singular only, because "Replaced 250 valves" is a count) standing within three words after the number, or before it with only a brand or series word between them, which is how an equipment list writes it (`- Chart recorder, Rosemount 3051, panel LCP-3`). Everything else a plain number can be is checked first and kept: a unit or a percent after it (any unit counts here, including the ones that double as ordinary words, so `Ambient 72 F at the transmitter` survives), a clock time, a thousands group, a year, a plant or panel word in front of it (`CUSTOMER_COPY_KEEP_PREFIXES`, `CUSTOMER_COPY_KEEP_PAIR_PREFIXES`, and `CUSTOMER_COPY_MODEL_KEEP_WORDS` — `Basin 12`, `Room 101`, `Blower 12`, `Manhole 12`, `Pump 14`, `Lift Station 3`), an ISA prefix, a job label (`Work order 44821`, `Ticket 5521`), this deal's job number, a date word (`August 19`), and the shop's own test equipment, whose model is the calibration's traceability record rather than the customer's asset (`Fluke 754`). Adding to the noun list means adding a plant word that can precede the same number, and both directions go in the checks.
- **A number withheld once is withheld everywhere in the copy.** Each pass reads one line at a time, so a repeat mention with nothing beside it to identify it — `Re-ranged the Rosemount 3051 to 0-150 in H2O` after the equipment list named it, or any unlabeled mention of a number the report labeled once (`Model: Rosemount 3051`) — has no signal of its own. `redactCustomerCopyBareCodes()` runs a second sweep over the text with every ambiguous code the copy already withheld (`opts.seen`, seeded from `redactCustomerCopyLabeledIds()`), and removes those exact numbers wherever else they appear. The reading and reference guards still apply on the second sweep, so a reading that happens to be the same number (`Totalizer read 3051 gallons`) stays. Only the codes no shape catches on their own are carried over — a plain number and a tag-shaped code — because the rest already go everywhere they appear, and a brand word is not a code at all.
- **A model can wear the shape of a plant tag, and a brand is what tells them apart.** `Hach SC200` is a controller model that reads as an ISA tag (`SC` is a real function code), so the tag exception was hiding it. It is withheld when a brand or series word wrote it and the equipment stands beside it, and the plant's own tags stay: a word is not a brand just because it opens the sentence — `Recorded FIT101 at the transmitter` says nothing about a brand — and a verb is never one (`Read`, `Found`, anything ending in `-ed` or `-ing`). An abbreviated brand (`ABB`, `GF`, `YSI`) is written in capitals, so it still reads as one at the start of a sentence. A hyphenated tag (`FIT-101`, `LCP-3`, `SC-1`) is never touched by this.
- **A labeled value can be more than one token.** `Model: Honeywell DR4500A`, `Model: Partlow MRC 7000`, and `P/N: 900E 01` are all one identifier. `customerCopyIdValueEnd()` takes up to two leading brand/series words plus the codes after them and stops at the first ordinary word or punctuation, so `Model: DR4500A installed in panel 3` keeps the rest of the sentence. A labeled value with no code in it is left alone, which is what protects prose like "parts used were on hand".
- **Job references are not equipment data.** `Work order`, `Purchase order`, `Sales order`, and `Change order` numbers stay on a customer copy — they are the customer's own reference, as are `WO 44821`, `PO 7781`, and a site address with its ZIP (`Rogers, MN 55374`). Only equipment identifiers are withheld. That holds on a pricing line too: `CUSTOMER_COPY_JOB_LABEL_RE` keeps the number after a job label, so `Quoted 1,850 against work order 44821` withholds the price and keeps the work order.
- **The deal's job number is part of the deal name and always stays.** The four-digit number in a deal name is how the shop and the customer both refer to the visit, so `customerCopyLooksLikeJobNumber()` keeps every shape it is written in — `4641`, `#4641`, `4641-2`, `CAC-4641`, `IA-4641`, `P4641`, and `Rogers WWTP 4641` — and `customerCopyJobRefTokens()` carries the same number through the report body and photo notes, not just the header. A code in the deal name that happens to share that shape (`DR-4500`, `3051`) is withheld only on **evidence** from the report, gathered by `customerCopyDealNameEvidence()`, and there are exactly two kinds: the report carried the same code **under an identifier label** (`Model: DR-4500`), which is what the generation prompts ask for, or the report body withheld the same number **with a brand in front of it** (`Rosemount 3051 transmitter`), which is as deliberate as a label. A bare mention deliberately does not count: a report says "job CAC-4641" as readily as it says "Honeywell DR-4500", and treating every code-shaped mention as equipment cost the deal name its own number. Neither does the site's own name count as a brand — the account name's words are excluded, so `Calibrated the Rogers 4641 chart recorder` leaves the visit's number alone. The body is read for evidence *without* this deal's keep list, because the keep list is what the answer decides; and because `customerCopyKeepTokens()` narrows the body's keep list to what survives in the name, evidence found once removes the number from the header and the body together. That last part is what the field hit at v390: a deal named `CAC-4641 Rosemount 3051 transmitter calibration` protected `3051` as a job number and the keep list then shielded it in every section of the report. The limit that remains: a model in a deal name written in the job-number shape that the report never labels and never writes with a brand stays in the header. Unambiguous shapes (`DR4500A`, `MRC7000`, `MRC 7000`, `FMU90-R11CA111AA3A`, `51404671-501`) never need evidence. `customerCopyKeepTokens()` then narrows the body's keep list to what actually survives in the deal name, so the header and the body can never disagree about the same number: a deal named after a model does not license that model anywhere else.
- **Plant tags stay.** An ISA loop tag (`FIT-101`, `LT-200`, `AIT-2301`, `FIT101`) and a panel or area tag (`LCP-3`, `MCC-2`, `VFD-1`) tell the customer which instrument was serviced, so `customerCopyIsPlantLoopTag()` and `CUSTOMER_COPY_KEEP_PREFIXES` keep them. The tag exception needs a real ISA function code, which is what stops a part number such as `GK-4471` or `DR-4500` from hiding behind the same shape. A hyphenated model whose prefix *is* an ISA code has to be labeled to be withheld.
- **Never redact readings.** Calibration values, engineering units, percentages, dates, and durations must survive — they are the point of the report. `customerCopyIsUnitReading()` keeps anything carrying a unit (`24VDC`, `4-20mA`, `0-150inH2O`, `3/4in`, `120VAC/24VDC`), `CUSTOMER_COPY_NOT_CODE_RES` keeps dates, times, revisions, chemistry (`H2SO4`, `NaOCl`), and material grades (`SS316`, `316L`), and `CUSTOMER_COPY_KEEP_PREFIXES` keeps ratings and standards (`IP65`, `SIL2`, `NEMA 4X`, `ISO 17025`) plus lab abbreviations (`MLSS 3200`, `TDS 450`). A pricing line withholds money but keeps a number followed by a unit, a duration, or a count ("within 12 months", "4 rolls"). When extending the rules, add a "must not redact" case alongside every "must redact" case, and put both in `tests/customer-copy-redaction.js`.
- **Any new AI or free-text field that lands in a report must be routed through the filter** before it reaches a customer copy. Add it to `customerSafePhotos()` (or the equivalent) in the same PR that introduces it.
- **A parts list is filtered like any other section, and the shape of the line matters.** Parts Lookup writes its parts into capture section 10, which reaches the copy through the report body, so no new render path is involved — but `partsLookupLine()` writes the line for the filter as much as for the reader. The part number carries its label (`Part number: 51404671-501`), because a labeled value is lifted out with its label; and it stands as **its own sentence** rather than as an item between two commas, because a value set off by commas takes both commas with it and the quantity would be welded to the manufacturer (`Honeywell qty 1`) on every customer copy. A customer copy of a parts line keeps the part name, the manufacturer, the quantity, the deficiency it is for, and the source, and loses the number: `- Pen arm assembly, red, chart recorder, Honeywell. Qty 1 — for: pen drive binding at mid-span. Wear part. Source: Honeywell parts list.` A parts section whose every line was only a number takes its heading with it, like any other emptied section. The lookup is told never to write a price and never to write a placeholder where a number should be — a number it could not find arrives empty, because wording in its place would reach the report as if it were a value. Rules: `docs/PARTS_LOOKUP_RULES.md`.
- **Generation prompts must require labeled numbers and forbid placeholders.** The report, photo-caption, and synthesis prompts instruct the model to write `Serial: …` / `Part number: …` rather than a bare number, which is what makes the value detectable later — and what lets the label be lifted out with it so the sentence still reads. The same prompts tell the model to write the number itself and never a placeholder (`[redacted]`, `withheld`, `not shown`, `N/A`) and never to mention redaction, withholding, or customer copies at all: removal happens when the copy is rendered, and a model that redacts on its own both hides the value from the internal copy and puts redaction wording in front of the customer. Keep both instructions in any new prompt that can mention equipment.
- **A typed `Other` name containing "customer" is treated as a customer copy** (`isCustomerCopyLabel()` matches `/customer/i`), so a hand-typed "Customer Walkthrough" is filtered too.
- **History always keeps the full capture.** Rendering a customer copy must never change stored state: `redactCustomerCopyText()` returns new strings and `customerSafePhotos()` copies the photos, so any copy type can still be rebuilt from History later. A background autosave (`saveCaptureWorkLocally({silent:true})`) can add or update but never blank content — `mergeHistoryRecord()` keeps the existing `report`, `voiceNotes`, `sections`, `photoData`, `videos`, and transcript when the incoming meta is empty, because the Capture DOM is empty whenever a report was opened from History with **View**. The same merge also runs **per photo**: an autosave that describes the same photo with less text keeps that photo's stored `desc`, `label`, `aiDesc`, and `synthesis`. Only a deliberate save writes exactly what is on screen.
- **Regenerate and Continue must work on the stored capture.** `View` loads a report for review only; anything that rebuilds or edits a report goes through `loadHistoryRecordIntoCapture()` first so it operates on the full record rather than an empty Capture tab. Live capture work on screen always wins, so unsaved edits are never overwritten.
- **Show the technician what is withheld.** The Report tab renders exactly what the active copy will contain and shows both the count and the list of withheld items, so a customer copy is verifiable on screen before it is sent.
- **Every change to the filter runs `node tests/customer-copy-redaction.js`.** The checks lift the redaction block straight out of `src/app.js` and cover both directions — codes that must go, readings/tags/job references that must stay — including a whole report the way the AI writes one.
- The Zoho Deal note keeps the unfiltered report: it is the internal CRM record, never handed to a customer, and redacting it would permanently lose captured detail.

## Documentation rules

Update documentation when a change affects:

- field workflow
- Android setup
- Zoho behavior
- WorkDrive behavior
- asset workflow
- pending sync behavior
- training steps
- major UI changes
- version milestone

Relevant docs:

```text
README.md
docs/CAPSTONE_CHANGELOG_AND_ROADMAP.md
docs/CAPSTONE_PROGRAM_REVIEW_CHECKLIST.md
docs/CAPSTONE_FIELD_TEST_LOG.md
docs/CAPSTONE_ANDROID_TRAINING_VIDEO_SCRIPT.md
docs/CAPSTONE_UI_WORKFLOW_CONSISTENCY_AUDIT.md
docs/CAPSTONE_DEVELOPMENT_RULES.md
```

Update `docs/CAPSTONE_CHANGELOG_AND_ROADMAP.md` on every feature PR, user defer/decline decision, or doc milestone — do not recreate status from chat history.

## Testing rules

Every code PR should run at least:

```text
node --check src/app.js
node --check netlify/functions/zoho-proxy.js
node tests/customer-copy-redaction.js
node tests/parts-lookup.js
node tests/pdf-layout.js
node tests/copy-capture-to-deals.js
git diff --check
```

Also perform targeted content checks for the specific feature.

For Android-facing changes, include a test URL:

```text
https://BJWCAC.github.io/fieldpro/FieldPro.html?v=<version>
```

## PR rules

Each PR should include:

- summary
- affected screens
- behavior changes
- verification steps
- Android test flow
- known limitations
- whether docs were updated or not needed

Keep PRs small when possible.

## Suggested review question for every future change

Before finishing a change, ask:

> If this behavior exists here, should the same pattern exist anywhere else in CapStone?

If yes, either implement it now or add it to the improvement list.

## Current next consistency priorities

Audit Phase 1–3 items are largely complete as of v198. See `docs/CAPSTONE_UI_WORKFLOW_CONSISTENCY_AUDIT.md` completion table and `docs/CAPSTONE_CHANGELOG_AND_ROADMAP.md` for status.

Optional remaining polish (only if field testing requests):

1. Capture photo type labels.
2. Further Capture/Assets photo parity.

Current doc/testing priorities:

1. Keep README and training script aligned with `FP_VERSION`.
2. Run `docs/CAPSTONE_PROGRAM_REVIEW_CHECKLIST.md` on Android; log in `docs/CAPSTONE_FIELD_TEST_LOG.md`.
3. Update `docs/CAPSTONE_CHANGELOG_AND_ROADMAP.md` on every PR.

## Long-term direction

These rules should continue to apply as CapStone moves toward:

- backend database
- user login
- multi-user support
- cross-device sync
- offline mode
- additional tabs and workflows
- broader Zoho modules
