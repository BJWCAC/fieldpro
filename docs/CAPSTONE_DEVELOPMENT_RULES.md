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
- matching button and card styling
- documentation updates

Do not add a new tab as a one-off design. New tabs should feel like the existing Capture and Assets workflows.

## Consistency checklist for every PR

Before a PR is considered complete, check:

1. Does this change affect Capture?
2. Does this change affect Assets?
3. Does this change affect Report?
4. Does this change affect Deals?
5. Does this change affect History?
6. Does this change affect Settings?
7. Does this change need Pending Sync support?
8. Does this change need local draft/recovery support?
9. Does this change need a status badge, warning, or confirmation?
10. Does this change need README or training documentation updates?
11. Does this change need a version bump and cache-busting update?
12. Does this change need a backup branch before work begins?

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

Future candidates:

- Asset form draft autosave
- future new tabs with field data
- offline report/asset sessions

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

From the UI / Workflow Consistency Audit:

1. Rename Pending Sync to Pending Sync.
2. Add Deal Selection Workflow card.
3. Standardize save/retry button labels.
4. Add Asset Save Checklist.
5. Add Asset Draft Autosave.
6. Align Capture photo naming/status closer to Assets.
7. Improve History card status display.
8. Reorganize Settings into grouped sections.
9. Improve replacement history display.

## Long-term direction

These rules should continue to apply as CapStone moves toward:

- backend database
- user login
- multi-user support
- cross-device sync
- offline mode
- additional tabs and workflows
- broader Zoho modules
