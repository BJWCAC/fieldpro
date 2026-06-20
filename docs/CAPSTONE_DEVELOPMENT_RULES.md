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
| `.bb` / `.bb-lg` | Teal — primary workflow (Upload, Snap, Search, Use Active Deal) |
| `.bs` / `.bs-lg` | Green — success / generate / save actions |
| `.bg` / `.bg-lg` | Secondary — neutral actions (Edit, PDF, Cancel, PICK DEAL in bars) |
| `.bd` / `.bd-lg` | Red — remove / delete |
| `.bsm` | Small padding modifier |
| `.bfull` | Full width |

Do not use undefined classes (e.g. `.bb` without a matching rule) or `.bg-lg` for primary tab entry actions — use `.bb-lg` or `.bs-lg` instead.

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

This applies to **every** `Asset_Category` value — current and future (Flow Meter, Flow Open Channel, Gas Detector, Analytical, Lift Station, Scales & Balances, and any category added later).

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

**CapStone UI:** category-specific fields render from `categoryLayouts` via `syncAssetCategoryLayoutUi()` / `renderAssetCategoryFields()`. Always load equipment config before rendering category sections.

**Category suggested defaults:** `categorySuggestedDefaults` in `src/config/zohoEquipmentFields.json` defines per-category suggestion hints (shown as `(suggested: …)` — user must still tap/select each field). **Flow Open Channel (all new and updated assets):** Display Engineering Units → GPM US; Set Up Input Engineering Units → H2O Inches; Set Up Output Engineering Units → 4-20 mA; Duration → 0.75. **When Brand = Pulsar and Series = Ultra 4:** Input PV Zero Parameter → P005; Input PV Span Parameter → P006. Changing Brand or Series refreshes conditional suggestions.

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
