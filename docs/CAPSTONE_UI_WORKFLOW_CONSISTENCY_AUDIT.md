# CapStone UI / Workflow Consistency Audit

This audit reviews the current CapStone screens so the Capture/Report and Assets portions can feel like one consistent program before larger roadmap items continue.

```text
Audit originally written for: v182
Last audit review: v198 (2026-06-08)
Status: Phase 1–3 items largely complete — see CAPSTONE_CHANGELOG_AND_ROADMAP.md for current status
Remaining optional polish: Capture photo type labels (only if field testing requests)
```

Current reviewed build: **v198** (historical recommendations below; many are now shipped)

## Goal

Make the major CapStone sections:

- look similar
- use the same status language
- use the same save/retry patterns
- expose context consistently
- avoid surprising resets or stale state

This audit is intentionally a planning document. It should guide small polish PRs rather than a large behavior-changing rewrite.

## Screens reviewed

- Deals
- Capture
- Assets
- Report
- History
- Settings
- Global header/tab bar

## What is already consistent

### Global navigation

- Main sections are in the tab bar.
- Pending sync now has a visible light red badge.
- Quick Start and Settings are available from the header.
- CapStone version is visible.

### Capture and Assets

Both now have workflow cards near the top:

- Capture Workflow
- Asset Workflow

Both use:

- white cards
- green success language
- amber/green action buttons
- light red warning patterns
- pending retry language

### Reliability direction

Both workflows are moving toward:

- local draft/recovery
- pending retry queues
- clearer saved/failed status
- Zoho update rather than duplicate creation

## Key inconsistencies and recommended fixes

## 1. Deals screen is less guided than Capture and Assets

Current state:

- Deals has Refresh/Import, filters, sort controls, and deal cards.
- It does not have a workflow/explanation card like Capture and Assets.

Recommendation:

Add a small **Deal Selection Workflow** card:

1. Refresh Zoho deals.
2. Search/filter by account, deal, or stage.
3. Select the active deal before Capture or Assets.
4. Confirm the header shows the correct deal.

Priority: Medium

Reason:

This makes Deals match the guided structure now used in Capture and Assets.

## 2. Report screen has more advanced save/retry UI than Assets

Current state:

- Report has checklist, retry actions, save confirmation, upload status, and PDF options.
- Assets has status messages, required field highlighting, saved state, and pending queue support, but less structured save confirmation.

Recommendation:

Add an **Asset Save Checklist** card similar to Report:

- Deal selected
- Account ID available
- Required fields complete
- Photos ready
- Existing asset loaded or Add New confirmed
- Pending sync status

Priority: High

Reason:

Assets now has enough workflow complexity that a pre-save checklist would reduce mistakes.

## 3. Capture draft status has no equivalent in Assets

Current state:

- Capture shows draft saved/restored status.
- Assets does not yet autosave the in-progress asset form as a draft.

Recommendation:

Add **Asset Draft Autosave**:

- save current asset form locally
- restore if Android reloads
- clear when Save Another Asset or deal changes
- show Asset Draft saved status

Priority: High

Reason:

Asset creation can take time onsite. Losing a partially filled asset form would be frustrating.

## 4. Pending Sync label says uploads, but queue now covers more than uploads

Current state:

Pending queue can include:

- asset photo attachments
- Deal PDF attachment
- WorkDrive PDF
- report note save/update
- deal asset link
- equipment asset note
- deal asset note

Recommendation:

Rename UI from **Pending Sync** to **Pending Sync**.

Change wording:

- Pending Sync -> Pending Sync
- Retry Sync -> Retry Sync
- sync item(s) still pending -> sync item(s) still pending

Priority: High

Reason:

The queue now retries more than file uploads.

## 5. Assets has Add/Update modes; Capture does not have explicit mode language

Current state:

- Assets clearly separates Add New Asset vs Update Existing Asset.
- Capture has New Project and History continue, but the mode is less obvious.

Recommendation:

Add a small Capture mode/status line:

- New report
- Continuing report from History
- Generated report ready
- Saved to Zoho

Priority: Medium

Reason:

It would reduce confusion when reopening reports from History.

## 6. Save button language should be standardized

Current examples:

- Save to Zoho
- Save Asset to Zoho
- Saved
- Retry Save to Zoho
- Retry Uploads/PDF
- Retry Sync

Recommendation:

Use consistent labels:

- Save Report to Zoho
- Save Asset to Zoho
- Saved
- Retry Report Save
- Retry File/Sync Items
- Retry Sync Sync

Priority: Medium

Reason:

Clearer language helps field users know what is being saved.

## 7. History cards use older styling compared with newer white workflow cards

Current state:

- History is functional.
- It does not yet have the same guided/status feel as Capture and Assets.

Recommendation:

Polish History:

- white cards consistently
- clearer action buttons
- show saved status:
  - Zoho saved
  - PDF attached
  - pending sync
- show report technician

Priority: Medium

Reason:

History is central to continuing reports and should match the rest of CapStone.

## 8. Settings is powerful but getting crowded

Current state:

Settings contains:

- Technician
- Quick Start
- Zoho/save behavior
- Pending Sync
- API key
- Troubleshooting
- History storage
- Appearance
- App information

Recommendation:

Group Settings visually:

1. User / Technician
2. Sync / Pending
3. Storage / History
4. Troubleshooting
5. Appearance
6. App Info

Priority: Low to Medium

Reason:

Settings is usable, but grouping will become more important as CapStone grows.

## 9. Asset and Capture photo flows are not yet aligned

Current state:

Assets:

- multiple photos
- short photo names
- photo preview before filename description
- skip unchanged photo uploads
- pending retry queue

Capture:

- multiple photos
- descriptions
- AI captions/synthesis
- WorkDrive upload
- PDF use
- less explicit per-photo upload status/naming

Recommendation:

Bring Capture photo management closer to Assets:

- short photo labels
- upload status per photo
- pending status per photo
- stable filename visibility
- optional photo type labels

Priority: Medium to High

Reason:

Photos are central to both workflows.

## 10. Asset replacement history is improving, but should be easier to read

Current state:

- Replacement notes are appended to Description / Instructions.
- Asset History panel can show replacement notes.

Recommendation:

Improve replacement history display:

- separate replacement events into cards
- show date, technician, old model/serial, new model/serial
- eventually use a dedicated Zoho subform or related module

Priority: Medium

Reason:

This will matter for long-term asset tracking.

## Recommended polish order

### Phase 1: Naming and visibility cleanup

1. Rename Pending Sync to Pending Sync.
2. Add Deal Selection Workflow card.
3. Standardize save/retry button labels.

### Phase 2: Asset/Capture parity

4. Add Asset Save Checklist.
5. Add Asset Draft Autosave.
6. Align Capture photo naming/status closer to Assets.

### Phase 3: History and Settings polish

7. Improve History card status display.
8. Reorganize Settings into grouped sections.
9. Improve replacement history display.

### Phase 4: Larger architecture work

10. Backend database/login foundation.
11. Multi-user support.
12. Full offline mode.
13. Continued code modularization.

## Audit completion status (v198)

| # | Recommendation | Status |
|---|----------------|--------|
| 1 | Pending Sync naming | Done (PR #65, #67) |
| 2 | Deal Selection Workflow card | Done (PR #66) |
| 3 | Standardize save/retry labels | Done (PR #67, #80) |
| 4 | Asset Save Checklist | Done (PR #68) |
| 5 | Asset Draft Autosave | Done (PR #69) |
| 6 | Capture photo naming/status | Mostly done (labels, sync status, phone backup) — optional type labels remain |
| 7 | History card status display | Done (PR #71, #76) |
| 8 | Reorganize Settings | Done (PR #72) |
| 9 | Replacement history display | Done in-app (PR #73) — no Zoho subform (declined) |
| — | Collapsible help boxes | Done (PR #81, v194) |
| — | Capture mode status line | Done (PR #80, v193) |
| — | Local save / phone backup / storage warning | Done (PR #83–#85, v196–v198) |

## Notes

Do not combine too many of these changes at once. The best path is a series of small PRs so each screen can be tested on Android after every change. For what to build next, use `docs/CAPSTONE_CHANGELOG_AND_ROADMAP.md`.
