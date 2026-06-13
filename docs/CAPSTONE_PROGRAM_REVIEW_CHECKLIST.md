# CapStone Program Review Checklist

Use this checklist periodically after a group of CapStone changes. The goal is to make sure all parts of the program stay consistent, reliable, and aligned as new tabs and workflows are added.

**Test build:** `https://BJWCAC.github.io/fieldpro/FieldPro.html?v=206`

**Focused runbook (Track A):** `docs/FIELD_TEST_TRACK_A.md`

**Log results in:** `docs/CAPSTONE_FIELD_TEST_LOG.md`

Recommended review cadence:

- after several feature PRs
- before starting a major new module
- before large refactors
- before multi-user/backend work
- after field testing reveals workflow gaps

## Review rules

- Review the whole program, not only the latest feature.
- Compare new behavior against existing Capture, Assets, Report, History, Settings, and Pending Sync patterns.
- If a pattern is useful in one area, decide whether it should exist in the other areas.
- Keep changes small after the review. Create focused PRs from the findings.

## 1. Global navigation

Check:

- [ ] Header shows CapStone and current version.
- [ ] Quick Start button works.
- [ ] Settings button works.
- [ ] API key indicator works.
- [ ] Tab order still makes sense.
- [ ] Pending Sync badge appears when pending items exist.
- [ ] Pending Sync badge opens Settings.
- [ ] No tab has stale state after switching between tabs.

Notes:

```text

```

## 2. Deals

Check:

- [ ] Deal Selection Workflow card is present.
- [ ] Refresh from Zoho works.
- [ ] Cached deals display correctly.
- [ ] Search/filter works.
- [ ] Sort works.
- [ ] Selecting a deal updates header/context.
- [ ] Selecting a new deal clears stale Capture/Asset state where appropriate.
- [ ] Account ID is preserved for asset creation.
- [ ] Errors are visible and understandable.

Notes:

```text

```

## 3. Capture

Check:

- [ ] Capture Workflow card is present.
- [ ] Draft saved status appears after edits.
- [ ] Draft restore prompt works after reload.
- [ ] Deal context is correct.
- [ ] GPS capture works.
- [ ] GPS displays consistently.
- [ ] Voice notes save into draft/history.
- [ ] Section fields save into draft/history.
- [ ] Capture photo labels work (keyboard stays open while typing).
- [ ] Capture photo descriptions work (keyboard stays open while typing).
- [ ] Collapsible Capture help boxes work.
- [ ] Local History save appears (draft status / Save Locally).
- [ ] Save Locally writes to History before Zoho.
- [ ] Phone photo backup works (auto and Save to Phone / Save All).
- [ ] Storage warning appears at 8+ photos or high storage use.
- [ ] Per-photo sync status and Retry Photo work.
- [ ] Remove photo works.
- [ ] Generate AI Report works (local save before network).
- [ ] Capture state does not leak across new projects.

Notes:

```text

```

## 4. Assets

Check:

- [ ] Asset Workflow card is present.
- [ ] Asset Save Checklist is present.
- [ ] Add New Asset mode works.
- [ ] Update Existing Asset mode works.
- [ ] Find Existing Asset works by CAC/AMD ID.
- [ ] Find Existing Asset works by serial/model when applicable.
- [ ] Find Existing Asset works by brand/type/series (partial match).
- [ ] Deal Instrument_Description refreshes when asset already linked.
- [ ] Loading an existing asset populates form fields.
- [ ] Replace Instrument workflow works.
- [ ] Asset History panel displays loaded asset data.
- [ ] Required fields highlight light red when missing.
- [ ] Save is blocked until required fields are complete.
- [ ] Multiple asset photos work.
- [ ] Asset photo preview before filename description works.
- [ ] Asset photo filenames use asset number + short description + number.
- [ ] Saved This Visit works.
- [ ] Save Another Asset clears the right fields but keeps the right context.
- [ ] Switching deals/accounts clears stale asset fields and asset IDs.
- [ ] Asset draft saved status works.
- [ ] Asset draft restore works after reload.
- [ ] Assets link to Deal `Assets_and_Checklist`.
- [ ] Equipment update notes are created.
- [ ] Deal asset notes are created.

Notes:

```text

```

## 5. Report

Check:

- [ ] Report save checklist is present.
- [ ] Report header has account/deal/GPS.
- [ ] Report body is readable.
- [ ] PDF Options are white/consistent.
- [ ] Download PDF works.
- [ ] Save Report to Zoho works.
- [ ] Existing Zoho report note updates instead of duplicating.
- [ ] Deleted Zoho note creates replacement.
- [ ] Deal PDF attachment works.
- [ ] WorkDrive PDF upload works.
- [ ] Retry Report Sync works.
- [ ] Report save confirmation is clear.
- [ ] Pending Sync catches failures.

Notes:

```text

```

## 6. History

Check:

- [ ] History list loads.
- [ ] View report works.
- [ ] Open + Continue works.
- [ ] Continued report restores deal/report/photos/sections.
- [ ] Continued report updates existing Zoho note when possible.
- [ ] PDF from history works.
- [ ] Archive/restore works.
- [ ] History card styling is still acceptable compared with newer screens.
- [ ] Technician and saved status are visible enough.

Notes:

```text

```

## 7. Settings

Check:

- [ ] Technician dropdown saves and restores.
- [ ] Pending Sync panel shows count and details.
- [ ] Retry Sync works.
- [ ] Clear Sync works.
- [ ] Auto-save setting works.
- [ ] API key modal works.
- [ ] Reset app cache works.
- [ ] Clear WorkDrive cache works.
- [ ] Clear cached deals works.
- [ ] Export/import History works.
- [ ] Storage info updates.
- [ ] App version is current.
- [ ] Settings are grouped logically.

Notes:

```text

```

## 8. Pending Sync

Check:

- [ ] Pending Sync badge appears for pending items.
- [ ] Pending Sync badge disappears when queue is empty.
- [ ] Auto retry runs on app open.
- [ ] Auto retry runs when Android/Chrome comes online.
- [ ] Auto retry runs when app returns to foreground.
- [ ] Manual Retry Sync works.
- [ ] Queue item attempts/errors display.
- [ ] Asset photo retry works.
- [ ] Deal PDF retry works.
- [ ] WorkDrive PDF retry works.
- [ ] Zoho report note retry works.
- [ ] Deal asset link retry works.
- [ ] Equipment asset note retry works.
- [ ] Deal asset note retry works.

Notes:

```text

```

## 9. Visual consistency

Check:

- [ ] Primary workflow cards use consistent style.
- [ ] Warning areas use light red or existing warning style.
- [ ] Success states use green.
- [ ] Primary action buttons are consistent.
- [ ] Secondary action buttons are consistent.
- [ ] Required fields behave consistently.
- [ ] White data-entry cards remain readable.
- [ ] Dark mode/light mode still behave acceptably.

Notes:

```text

```

## 10. Wording consistency

Check:

- [ ] Use CapStone as the program name.
- [ ] Use Pending Sync instead of Pending Uploads.
- [ ] Use Save/Update wording consistently.
- [ ] Use Retry Sync wording consistently.
- [ ] Avoid stale version numbers in UI/docs.
- [ ] Avoid Field Pro / FieldPro as product name except repository/path references.

Notes:

```text

```

## 11. Documentation

Check:

- [ ] README version is current.
- [ ] README workflow still matches app.
- [ ] Android training script still matches app.
- [ ] UI/Workflow Consistency Audit still reflects current priorities.
- [ ] Development Rules still apply to current direction.
- [ ] New feature behavior is documented if field users need to know it.

Notes:

```text

```

## 12. Technical consistency

Check:

- [ ] App version was bumped for behavior/UI changes.
- [ ] Cache-busting query strings were updated for CSS/JS changes.
- [ ] `node --check src/app.js` passes.
- [ ] `node --check netlify/functions/zoho-proxy.js` passes.
- [ ] `git diff --check` passes.
- [ ] Any risky change has a backup branch.
- [ ] New Zoho fields use exact API names.
- [ ] New picklist writes use exact actual values.
- [ ] New external save operation is evaluated for Pending Sync.
- [ ] New data-entry workflow is evaluated for draft autosave.

Notes:

```text

```

## Review summary template

Use this after completing the checklist.

```text
Review date:
Reviewed by:
CapStone version:

Looks good:
-

Issues found:
-

Recommended next PRs:
1.
2.
3.

Needs field testing:
-

Do not change yet:
-
```

## Current suggested review rhythm

After every 3 to 5 feature PRs:

1. Run this checklist.
2. Add findings to a short review note.
3. Pick the smallest high-value consistency fix.
4. Merge/test before adding more large features.
