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
there rather than a one-off id override. A dark full-width `.bg-lg` is right for a utility action
on a dark pane (Pause, Save Video to Downloads, Save All Photos to Phone), but a step in the
report workflow needs a colour that says so — **Update Photos on This Report** is `.bb-lg` teal
like **Add Photos**, the action that leads into it, rather than a dark slab between the amber and
green actions around it. When one control renders on both a dark and a white surface — the Report
Copy Name picker appears on Capture and on Report — choose the neutral class from the scope being
rendered instead of restyling the shared component class. Anything that rewrites a button's
`className` at runtime (`dlPDF()` restoring **Download PDF**) has to restore the same class.

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

## Report generation input rules

**Everything the technician typed on site has to reach the report body.** `generate()` builds one
prompt, and any capture field left out of it silently disappears from the report even though it is
still stored and still shown beside the photos:

- Voice notes, the video transcript, the nine report sections, **and the technician's per-photo
  descriptions** all go into the prompt. A photo description is field data, not a caption — the AI
  Observation and AI Synthesis are the model's own text and are not a substitute for what the
  technician wrote.
- Only the first four photos are sent as images, so photo notes go in as text for **every** photo,
  independent of that image budget.
- The report body still must not describe photos or cite photo numbers. Fold the facts into the
  section they belong to instead.
- Any new capture field a technician can type into must be added to this prompt in the same PR —
  and, per the customer copy content rule, to the render-time filter.

**AI photo text belongs to the report photos, and Capture holds its own copy of each photo.**
`A.photos` (Capture) and `A.reportPhotos` (Report) are separate objects for the same photo, so
after `addAiPhotoNotes()` the observation and synthesis have to be handed back to `A.photos`.
Otherwise the next background History save — which describes the Capture tab — writes a leaner
copy of the same photo over the stored record and both AI blocks are gone. `mergeHistoryRecord()`
is the second line of defence: on a silent autosave it merges `photoData` per photo id and keeps
each photo's existing `desc`, `label`, `aiDesc`, and `synthesis` when the incoming copy has none.

## Customer copy content rule (applies to every capture, now and in future)

**A customer copy never contains equipment part numbers, model numbers, order numbers/order codes, serial numbers, or pricing of any kind.** A model number counts as a part number, and Endress+Hauser prints the same identifier as an order number / order code. This holds for every field the copy renders — the report body, the deal name in the header, the technician's photo description, the AI Observation, and the AI Synthesis. Internal Copy and Other copies carry the full detail.

- The deal amount is out of the report entirely: the PDF header, on-screen Report header, Zoho note header, and the AI generation prompt must not carry `Amount` or any pricing. Deal amount stays on the Deals tab, where it helps pick the right deal.
- **Filter at render, never at capture.** One report is generated per visit and any copy can be rendered from it afterwards (including months later from History), so the technician must never lose captured detail to satisfy a customer copy. `buildPDF()` filters when `isCustomerCopyLabel(copyLabel)` is true, which covers every PDF path at once — local download, WorkDrive, Deal attachment, History export — and `buildReportExportText()` does the same for share/email/clipboard.
- **Keep the label, drop the value.** `redactCustomerCopyText()` replaces a labeled identifier's value with `[not shown on customer copy]` and money with `[pricing not shown on customer copy]`, so the reader can see something was withheld rather than reading a doctored sentence.
- **A label is not required.** Reports say "Replaced the Honeywell DR4500A chart recorder" as often as they say "Model: DR4500A", so `redactCustomerCopyBareCodes()` also withholds a code by shape: mixed letters and digits at least four characters long (`DR4500A`, `MRC7000`, `uR1800`, `3051S`, `FMU90-R11CA111AA3A`), a grouped numeric code (`51404671-501`, `24001660-001`), and a spaced model prefix plus code (`MRC 7000`) via `redactCustomerCopySpacedCodes()`. Unlabeled codes are replaced with `[part number not shown on customer copy]` so the surrounding sentence still reads.
- **A labeled value can be more than one token.** `Model: Honeywell DR4500A`, `Model: Partlow MRC 7000`, and `P/N: 900E 01` are all one identifier. `customerCopyIdValueEnd()` takes up to two leading brand/series words plus the codes after them and stops at the first ordinary word or punctuation, so `Model: DR4500A installed in panel 3` keeps the rest of the sentence. A labeled value with no code in it is left alone, which is what protects prose like "parts used were on hand".
- **Job references are not equipment data.** `Work order`, `Purchase order`, `Sales order`, and `Change order` numbers stay on a customer copy — they are the customer's own reference, as are `WO 44821`, `PO 7781`, and a site address with its ZIP (`Rogers, MN 55374`). Only equipment identifiers are withheld.
- **The deal's job number is part of the deal name and always stays.** The four-digit number in a deal name is how the shop and the customer both refer to the visit, so `customerCopyLooksLikeJobNumber()` keeps every shape it is written in — `4641`, `#4641`, `4641-2`, `CAC-4641`, `IA-4641`, `P4641`, and `Rogers WWTP 4641` — and `customerCopyJobRefTokens()` carries the same number through the report body and photo notes, not just the header. A code in the deal name that happens to share that shape (`DR-4500`) is withheld only when the report carried the same one **under an identifier label** (`Model: DR-4500`), which is what the generation prompts ask for. Unlabeled mentions deliberately do not count as evidence: a report says "job CAC-4641" as readily as it says "Honeywell DR-4500", and treating every code-shaped mention as equipment cost the deal name its own number. The limit that leaves: a model in a deal name that is written in the job-number shape and never labeled in the report stays in the header. Unambiguous shapes (`DR4500A`, `MRC7000`, `MRC 7000`, `FMU90-R11CA111AA3A`, `51404671-501`) never need evidence. `customerCopyKeepTokens()` then narrows the body's keep list to what actually survives in the deal name, so the header and the body can never disagree about the same number: a deal named after a model does not license that model anywhere else.
- **Plant tags stay.** An ISA loop tag (`FIT-101`, `LT-200`, `AIT-2301`, `FIT101`) and a panel or area tag (`LCP-3`, `MCC-2`, `VFD-1`) tell the customer which instrument was serviced, so `customerCopyIsPlantLoopTag()` and `CUSTOMER_COPY_KEEP_PREFIXES` keep them. The tag exception needs a real ISA function code, which is what stops a part number such as `GK-4471` or `DR-4500` from hiding behind the same shape. A hyphenated model whose prefix *is* an ISA code has to be labeled to be withheld.
- **Never redact readings.** Calibration values, engineering units, percentages, dates, and durations must survive — they are the point of the report. `customerCopyIsUnitReading()` keeps anything carrying a unit (`24VDC`, `4-20mA`, `0-150inH2O`, `3/4in`, `120VAC/24VDC`), `CUSTOMER_COPY_NOT_CODE_RES` keeps dates, times, revisions, chemistry (`H2SO4`, `NaOCl`), and material grades (`SS316`, `316L`), and `CUSTOMER_COPY_KEEP_PREFIXES` keeps ratings and standards (`IP65`, `SIL2`, `NEMA 4X`, `ISO 17025`) plus lab abbreviations (`MLSS 3200`, `TDS 450`). A pricing line withholds money but keeps a number followed by a unit, a duration, or a count ("within 12 months", "4 rolls"). When extending the rules, add a "must not redact" case alongside every "must redact" case, and put both in `tests/customer-copy-redaction.js`.
- **Any new AI or free-text field that lands in a report must be routed through the filter** before it reaches a customer copy. Add it to `customerSafePhotos()` (or the equivalent) in the same PR that introduces it.
- **Generation prompts must require labeled numbers.** The report, photo-caption, and synthesis prompts instruct the model to write `Serial: …` / `Part number: …` rather than a bare number, which is what makes the value detectable later. Keep that instruction in any new prompt that can mention equipment.
- **A typed `Other` name containing "customer" is treated as a customer copy** (`isCustomerCopyLabel()` matches `/customer/i`), so a hand-typed "Customer Walkthrough" is filtered too.
- **History always keeps the full capture.** Rendering a customer copy must never change stored state: `redactCustomerCopyText()` returns new strings and `customerSafePhotos()` copies the photos, so any copy type can still be rebuilt from History later. A background autosave (`saveCaptureWorkLocally({silent:true})`) can add or update but never blank content — `mergeHistoryRecord()` keeps the existing `report`, `voiceNotes`, `sections`, `photoData`, `videos`, and transcript when the incoming meta is empty, because the Capture DOM is empty whenever a report was opened from History with **View**. The same merge also runs **per photo**: an autosave that describes the same photo with less text keeps that photo's stored `desc`, `label`, `aiDesc`, and `synthesis`. Only a deliberate save writes exactly what is on screen.
- **Regenerate and Continue must work on the stored capture.** `View` loads a report for review only; anything that rebuilds or edits a report goes through `loadHistoryRecordIntoCapture()` first so it operates on the full record rather than an empty Capture tab. Live capture work on screen always wins, so unsaved edits are never overwritten.
- **Show the technician what is withheld.** The Report tab renders exactly what the active copy will contain and shows a count of withheld items, so a customer copy is verifiable on screen before it is sent.
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
