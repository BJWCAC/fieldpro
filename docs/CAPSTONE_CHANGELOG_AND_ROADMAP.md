# CapStone Changelog & Roadmap

Living record of what CapStone has shipped, what is planned next, and what we have explicitly decided **not** to do.

**Maintain this file on every meaningful change** — feature PR, bug fix, doc update, field-test finding, or user decision to defer/decline work. Bump the `Last updated` line and add a short entry under the right section. Do not rely on chat history alone.

```text
Last updated: 2026-06-08
Current live version: v200 (Phase 1 cloud backend — PR pending)
Test URL: https://BJWCAC.github.io/fieldpro/FieldPro.html?v=200
Cloud API: https://dulcet-sherbet-40f8f6.netlify.app/.netlify/functions/capstone-api
```

---

## How agents and contributors should use this file

1. **Before starting work** — read *Planned*, *In progress*, and *Declined* so effort is not duplicated.
2. **After shipping** — move the item to *Completed* with version, PR number, and one-line outcome.
3. **When the user defers or declines** — add to *Deferred* or *Declined* with date and reason.
4. **When docs lag the app** — note under *Planned* until the doc PR lands.

Related docs (detail, not status):

- `docs/CAPSTONE_BACKEND_ARCHITECTURE.md` — cloud/backend phases
- `docs/CAPSTONE_DEVELOPMENT_RULES.md` — how to build and review
- `docs/CAPSTONE_PROGRAM_REVIEW_CHECKLIST.md` — periodic field QA
- `docs/CAPSTONE_FIELD_TEST_LOG.md` — log Android test results
- `docs/CAPSTONE_UI_WORKFLOW_CONSISTENCY_AUDIT.md` — polish audit (largely complete; see status table)

---

## Completed

### Reliability & data safety

| Version | PR | What shipped |
|---------|-----|--------------|
| v196 | #83 | Save Capture to local History **before** Zoho/network; Save Locally button; auto-save on visibility change; quota fallback |
| v197 | #84 | Auto-save capture photos to phone Downloads; Save to Phone / Save All; Settings toggle `fp_auto_save_phone_photos` |
| v198 | #85 | Early storage warning on Capture (8+ photos, high photo MB, ~4 MB total); warning after failed local save |
| v199 | #87 | History reopen autosave status + resume timers when continuing offline capture |
| v200 | pending | Cloud API, login/register, History metadata sync (Phase 1 backend) |

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
| Earlier | — | Equipment create/update, deal asset link, equipment + deal update notes, asset search, replace-instrument workflow, replacement notes in `Description_Instructions`, replacement cards in Asset History panel |

### Docs & process

| Date | What shipped |
|------|--------------|
| 2026-06-08 | `CAPSTONE_CHANGELOG_AND_ROADMAP.md` — living status doc |
| 2026-06-08 | Docs refresh to v198: README, training script, audit status, dev rules, checklist, field test log |

### Structure (earlier milestone)

| Version | What shipped |
|---------|--------------|
| v182 era | CSS/JS split from monolith; Deals, Capture, Assets, Report, History, Settings tabs; AI report; Zoho notes + PDF; WorkDrive; local History; technician selection; GPS; equipment asset workflow |

---

## In progress

| Item | Status | Notes |
|------|--------|-------|
| **Phase 1 backend / cloud sync (v200)** | PR pending | Login, register, History metadata push/pull — `CAPSTONE_BACKEND_ARCHITECTURE.md` |
| **Field test on Android** | User action | Continue checklist; retest v199 offline reopen |

---

## Planned (accepted — do next)

| Priority | Item | Notes |
|----------|------|-------|
| High | **Netlify env setup** | Set `CAPSTONE_INVITE_CODE` on Netlify site for team registration |
| High | **Field test completion** | Poor-signal + 10–15 photo scenarios |
| Medium | **Phase 2 cloud** | Photo blob storage, conflict UI, admin users |
| Medium | **Fix bugs from field test** | Small PRs per finding |
| On hold | **Training video recording** | After field test |
| Low | **Optional Capture photo parity** | Only if field testing requests |

---

## Deferred (maybe later — not committed)

| Item | Why deferred |
|------|----------------|
| Phase 3: cloud pending-sync queue + asset draft sync | After Phase 2 photo storage |
| Phase 4: Native Android app (TWA/Capacitor) | PWA may be sufficient |
| Refresh `zohoEquipmentFields.json` from Zoho | Only when CRM layout changes |

**Phase 1 started (v200):** backend API, login, multi-user accounts, History metadata sync.  
**Still deferred within backend roadmap:** full offline-first sync with photo blobs, admin portal, native shell.

---

## Declined (will not do)

| Item | Decision date | Reason |
|------|---------------|--------|
| **Dedicated Zoho replacement subform or separate replacement history module** | 2026-06-08 | User: replacing the existing asset and making a note is good enough. CapStone updates the same Equipment record, appends structured replacement text to `Description_Instructions`, and writes equipment + deal update notes. |

---

## Housekeeping

| Item | Action |
|------|--------|
| **PR #8** — “Document CapStone workflow and training script” (v182 era) | **Close** — superseded by ongoing doc updates on `main` and this v198 docs pass. Do not merge. |

---

## Open questions / waiting on user

| Item | Notes |
|------|-------|
| Field test results | Fill in `docs/CAPSTONE_FIELD_TEST_LOG.md` after device testing |
| Training video | On hold until field test complete |

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
| v200 | Cloud login + History metadata sync (Phase 1 backend) |
