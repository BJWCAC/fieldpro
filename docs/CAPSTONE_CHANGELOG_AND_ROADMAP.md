# CapStone Changelog & Roadmap

Living record of what CapStone has shipped, what is planned next, and what we have explicitly decided **not** to do.

**Maintain this file on every meaningful change** — feature PR, bug fix, doc update, field-test finding, or user decision to defer/decline work. Bump the `Last updated` line and add a short entry under the right section. Do not rely on chat history alone.

```text
Last updated: 2026-06-08
Current code version: v198 (branch cursor/storage-zoho-enhancements-7ea5, PR #85)
Test URL: https://BJWCAC.github.io/fieldpro/FieldPro.html?v=198
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
- `docs/CAPSTONE_UI_WORKFLOW_CONSISTENCY_AUDIT.md` — polish audit (partially stale; see Completed)

---

## Completed

### Reliability & data safety

| Version | PR | What shipped |
|---------|-----|--------------|
| v196 | #83 | Save Capture to local History **before** Zoho/network; Save Locally button; auto-save on visibility change; quota fallback |
| v197 | #84 | Auto-save capture photos to phone Downloads; Save to Phone / Save All; Settings toggle `fp_auto_save_phone_photos` |
| v198 | #85 | Early storage warning on Capture (8+ photos, high photo MB, ~4 MB total); warning after failed local save |

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
| Earlier | — | Equipment create/update, deal asset link, equipment + deal update notes, asset search by CAC/serial/model/name/building/designator, replace-instrument workflow, replacement notes in `Description_Instructions`, replacement cards in Asset History panel |

### Structure & docs (earlier milestone)

| Version | PR | What shipped |
|---------|-----|--------------|
| v182 era | — | CSS/JS split from monolith; Deals, Capture, Assets, Report, History, Settings tabs; AI report; Zoho notes + PDF; WorkDrive; local History; technician selection; GPS; equipment asset workflow |

---

## In progress

| Item | Status | Notes |
|------|--------|-------|
| PR #85 — storage warning + Zoho enhancements (v198) | Open (draft) | Awaiting merge to `main` |

---

## Planned (accepted — do next)

| Priority | Item | Notes |
|----------|------|-------|
| High | **Docs refresh to current version** | `README.md` still says v182; training script and audit header stale; dev rules still list asset draft as “future” |
| High | **Field test on Android** | Run `docs/CAPSTONE_PROGRAM_REVIEW_CHECKLIST.md` on device at current `?v=` build; log bugs as small PRs |
| Medium | **Training video** | Record from updated `CAPSTONE_ANDROID_TRAINING_VIDEO_SCRIPT.md` after script refresh (user action) |
| Low | **Optional Capture photo parity** | Photo type labels; further alignment with Assets naming patterns — only if field testing asks for it |
| Low | **Close or refresh stale doc PRs** | e.g. old open docs PR #8 if still relevant |

---

## Deferred (maybe later — not committed)

These are **not declined**. Revisit only after the field workflow is stable and docs/testing are current.

| Item | Why deferred |
|------|----------------|
| Backend + database | Large architecture change |
| User login / multi-user | Requires backend |
| Full offline mode with cross-device sync | Requires backend + auth |
| Further `src/app.js` modularization | Useful but not blocking field use |
| Native Android app | PWA + Add to Home screen may be sufficient |
| Refresh `zohoEquipmentFields.json` from Zoho | Only when CRM layout actually changes |

---

## Declined (will not do)

Explicit product decisions. **Do not re-propose without user asking.**

| Item | Decision date | Reason |
|------|---------------|--------|
| **Dedicated Zoho replacement subform or separate replacement history module** | 2026-06-08 | User: replacing the existing asset and making a note is good enough. CapStone already updates the same Equipment record, appends structured replacement text to `Description_Instructions`, and writes equipment + deal update notes. No separate CRM module needed. |

---

## Open questions / waiting on user

| Item | Notes |
|------|-------|
| Field test results | Poor-signal + 10–15 photo scenarios on real Android hardware |
| Training video timing | After script is updated to cover v196–v198 behavior |

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
