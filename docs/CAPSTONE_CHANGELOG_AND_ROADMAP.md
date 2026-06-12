# CapStone Changelog & Roadmap

Living record of what CapStone has shipped, what is planned next, and what we have explicitly decided **not** to do.

**Maintain this file on every meaningful change** — feature PR, bug fix, doc update, field-test finding, or user decision to defer/decline work. Bump the `Last updated` line and add a short entry under the right section. Do not rely on chat history alone.

```text
Last updated: 2026-06-08
Current live version: v201
Test URL: https://BJWCAC.github.io/fieldpro/FieldPro.html?v=201
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
- `docs/CAPSTONE_FIELD_TEST_LOG.md` — log Android test results
- `docs/PLAUD_INTEGRATION.md` — Plaud Note Pro + Inbox tab design and build phases

---

## Completed

### Reliability & data safety

| Version | PR | What shipped |
|---------|-----|--------------|
| v196 | #83 | Save Capture to local History **before** Zoho/network; Save Locally button; auto-save on visibility change; quota fallback |
| v197 | #84 | Auto-save capture photos to phone Downloads; Save to Phone / Save All; Settings toggle `fp_auto_save_phone_photos` |
| v198 | #85 | Early storage warning; Zoho asset search/deal description enhancements |
| v199 | #87 | History reopen autosave when continuing offline capture |
| v200 | #89 | Technicians from Zoho Internal_Assets.Users (no separate login list) |
| v201 | #90 | Per-field → AI with offline Pending AI queue (Capture, Assets, photos, report generate, asset extract) |

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
| 2026-06-08 | `PLAUD_INTEGRATION.md` — Plaud Note Pro division of labor, Inbox tab, Fork A/B sequencing |

### Structure (earlier milestone)

| Version | What shipped |
|---------|--------------|
| v182 era | CSS/JS split from monolith; Deals, Capture, Assets, Report, History, Settings tabs; AI report; Zoho notes + PDF; WorkDrive; local History; technician selection; GPS; equipment asset workflow |

---

## In progress

| Item | Status | Notes |
|------|--------|-------|
| **Field test on Android** | User action | v201 checklist including Pending AI weak-signal scenarios |

---

## Planned (accepted — do next)

| Priority | Item | Notes |
|----------|------|-------|
| High | **Field test completion** | Poor-signal + 10–15 photo scenarios; Pending AI section F |
| Medium | **Plaud Fork A — Stage 0** | Note Pro setup + MCP validate summarize → Zoho before code — see `PLAUD_INTEGRATION.md` |
| Medium | **Plaud Fork A — Stage 1 (Inbox tab)** | v202+ — unassigned voice staging, link to deal, shared transcribe/summarize pipeline |
| Medium | **Cloud sync Phase 1 (revised)** | Key sync by Zoho technician name — after field test, not separate accounts |
| Medium | **Fix bugs from field test** | Small PRs per finding |
| On hold | **Training video** | After field test |
| Low | **Optional Capture photo parity** | Only if field testing requests |

---

## Deferred (maybe later — not committed)

| Item | Why deferred |
|------|----------------|
| **Plaud Fork B — diary / RAG** | Ambient search, embeddings, pgvector, nightly digest — after Fork A Inbox is routine |
| Separate CapStone email/password accounts | Declined — use Zoho Users picklist for technician identity |
| Phase 2+ cloud photo storage, native app | See backend architecture when revised |
| Further `src/app.js` modularization | Not blocking field use |

---

## Declined (will not do)

| Item | Decision date | Reason |
|------|---------------|--------|
| **Dedicated Zoho replacement subform or separate replacement history module** | 2026-06-08 | User: replacing the existing asset and making a note is good enough. |
| **Separate CapStone technician list / email login** | 2026-06-08 | User: use Zoho CRM Internal_Assets.Users picklist for technicians instead. |

---

## Housekeeping

| Item | Action |
|------|--------|
| **PR #8** — old docs PR | **Close** — superseded |
| **PR #88** — separate cloud login | **Close** — superseded by Zoho Users technician approach |
| **Note Pro hardware** | **Order when ready** — first-day checklist in `PLAUD_INTEGRATION.md` |

---

## Open questions / waiting on user

| Item | Notes |
|------|-------|
| Field test results | Fill in `docs/CAPSTONE_FIELD_TEST_LOG.md` after device testing |
| Plaud Stage 0 validation | Run MCP flow in Claude chat after Note Pro setup |
| Inbox tab naming | Default **Inbox** — confirm before Stage 1 UI build |

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
| v200 | Technicians loaded from Zoho Internal_Assets.Users |
| v201 | Per-field → AI with offline Pending AI queue |
| v202+ | Plaud Fork A — Inbox tab + voice pipeline (planned) |
