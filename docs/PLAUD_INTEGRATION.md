# CapStone + Plaud Note Pro Integration

Design and phased build plan for combining CapStone (intentional deal walkthroughs) with Plaud Note Pro (calls and ambient capture). This document is the interface spec Cursor and contributors read alongside the codebase.

**Status:** Design accepted — build starts after field test v201 and Stage 0 MCP validation.

**Related:**

- `docs/CAPSTONE_CHANGELOG_AND_ROADMAP.md` — what is shipped, planned, deferred
- `docs/CAPSTONE_DEVELOPMENT_RULES.md` — new tab and consistency requirements
- `docs/CAPSTONE_FIELD_TEST_LOG.md` — field validation before Fork A build

```text
Last updated: 2026-06-12
Tab name: Inbox
Fork A: v202 Stage 1 in progress (Inbox UI + pipeline skeleton)
Fork B: deferred — see changelog
```

---

## Core idea: division of labor

CapStone and Plaud cover what the other physically cannot. Both feed the **same back-end pipeline** for Fork A (structured Zoho deal notes).

| Source | Role | Deal known at capture? |
|--------|------|------------------------|
| **CapStone Capture** | Intentional site walkthrough — phone in hand, deal selected, photos, GPS, sections, report | **Yes** — cleanest path |
| **Plaud Note Pro** | Phone calls, ambient/day diary, situations browser cannot record (screen lock, call audio) | **No** — lands in **Inbox**, link deal later |
| **Samsung / manual upload** | Backup when Note Pro not on person | **No** — same Inbox |

CapStone does **not** try to record phone calls or run all-day ambient capture in the browser. Plaud hardware sidesteps Android call-recording limits.

---

## Two forks

### Fork A — Deal pipeline (build first)

Curated and structured. Pick a deal (or link from Inbox), capture intentionally, file a clean field note to Zoho. **This is the primary ROI path.**

Aligns with existing CapStone: Deals → Capture → Report → Zoho note + PDF + WorkDrive.

### Fork B — Diary / RAG (later phase)

Ambient and exploratory. Capture everything, embed, search, find signal later. Shares capture → transcribe with Fork A but **diverges after** (Voyage embeddings, pgvector, nightly digest).

**Deferred in CapStone UI** until Fork A Inbox + link-to-deal is routine in the field. See changelog *Deferred*.

---

## How a recording becomes a Zoho deal note

```
CapStone walkthrough (deal already selected)
  Capture → Generate Report → Save to Zoho
  (existing path — no Inbox)

Plaud / unassigned audio
  Pull → transcribe → summarize → INBOX → user links deal → Zoho note
  (new path — Stage 1+)
```

### CapStone-sourced (unchanged primary path)

1. Select deal and technician.
2. Capture GPS, photos, voice notes, report sections (Wispr + → AI when online).
3. Generate AI report (Pending AI queues on weak signal — v201).
4. Save to Zoho — note, PDF, WorkDrive; Pending Sync on failure.

Recording is **born attached to the deal** — no matching logic.

### Plaud-sourced (new Inbox path)

1. Audio lands in **Inbox** (Plaud cloud sync → worker, MCP manual pull, or future webhook).
2. **AssemblyAI** transcribes with speaker diarization (async — webhook when done).
3. **Claude** summarizes to structured field note (same tone as Capture report).
4. User **links to deal** in Inbox (search/filter like Deals).
5. Write to Zoho via existing proxy patterns — Pending Sync if network fails.

**One staging area** — unmatched recordings, manual meetings, notes, tasks. Not several inboxes.

---

## Shared back-end pipeline (Fork A)

Reuses CapStone’s outbound Zoho/WorkDrive write path where possible.

| Step | Tool | Notes |
|------|------|-------|
| **Pull** | CapStone hands audio to Netlify; Plaud via CLI/MCP/webhook | Delete from Plaud cloud after pull (privacy) |
| **Transcribe** | AssemblyAI | Speaker labels; async webhook (avoid Netlify timeout) |
| **Summarize** | Claude (Sonnet) | Structured field note — existing CapStone report style |
| **File** | Zoho CRM deal note + WorkDrive | Reuse `zoho-proxy` patterns + Pending Sync |

**Plaud settings (locked in):**

- Free Starter plan — Cloud Sync **ON**
- Plaud auto-transcribe **OFF** (transcription via AssemblyAI in our pipeline)
- Note Pro ~$189 one-time; recurring ~$8–17/mo Fork A at typical volume (AssemblyAI + Claude; Plaud $0)

---

## CapStone UI: new **Inbox** tab

Not a “Plaud tab” — **source-agnostic staging** for unassigned voice.

### Tab bar (proposed)

| Tab | Purpose |
|-----|---------|
| Deals | Select deal context |
| Capture | Attended walkthrough (deal known) |
| Assets | Equipment workflow |
| **Inbox** | Unassigned voice — link deal, review, file note |
| Report | Review generated report |
| History | Local report continuity |
| Settings | Technician, sync, Plaud/AssemblyAI config (Stage 1+) |

Badge: **Inbox (n)** unlinked items — similar to Pending sync tab.

### Inbox workflow card (per development rules)

1. **Help / workflow card** at top — same pattern as Capture and Assets.
2. **List** — unassigned recordings with status: new, transcribing, ready for review, linked, synced.
3. **Primary actions** — Link to deal, Generate note, Save to Zoho, Retry.
4. **Review** — transcript preview, speaker labels, editable summary before save.
5. **Pending Sync / Pending AI** — failed transcription or Zoho write queues and retries automatically.
6. **Optional:** After linking a call to a deal, **Open in Capture** to add photos/GPS on site (do not re-record call in browser).

### What Inbox is not

- **Not** a replacement for Capture walkthroughs.
- **Not** merged into History (History = local report drafts; Inbox = external voice waiting for deal).
- **Not** Fork B search/RAG UI (deferred).

---

## MCP integration — three stages

Both Plaud official MCP and Zoho MCP can run in the same session for plain-English “summarize this recording and file to deal X.”

| Stage | Scope | Where |
|-------|--------|-------|
| **0 — Zero code** | Plaud MCP + Zoho MCP; manual summarize → note | Claude.ai chat — **validate before Cursor build** |
| **1 — Assisted** | Inbox tab + Netlify workers + review in CapStone | **Cursor / this repo** |
| **2 — Automated** | Plaud webhook → Netlify → Zoho note hands-off | After Stage 1 field-solid |

Stage 0 does **not** require Cursor. Run after Note Pro setup checklist (below).

---

## Relationship to v201 (offline field AI)

| Use case | Tool |
|----------|------|
| Short dictation in fields (sections, photo desc, assets) | Wispr + **→ AI** + Pending AI queue (v201) |
| Long-form audio (calls, meetings, ambient) | Plaud + **AssemblyAI** + Inbox tab (Stage 1+) |

Do not send 45-minute call audio through per-field → AI. Long audio uses AssemblyAI; Claude summarizes once.

---

## Netlify functions (Stage 1 — to build)

Not in repo yet. Planned alongside Inbox UI.

| Function | Role |
|----------|------|
| `submit-recording` | Accept audio upload or Plaud pull metadata; send to AssemblyAI |
| `transcript-ready` | AssemblyAI webhook; store transcript; trigger summarize job |
| Extend `zoho-proxy` | Or thin wrapper — reuse deal note + WorkDrive writes |

Existing: `netlify/functions/zoho-proxy.js` — deals, notes, PDF, WorkDrive, equipment, technicians.

---

## Sequencing

### Now (before Plaud code)

1. **Field test v201** — merge PR #90; exercise Pending AI + existing Capture path.
2. **Note Pro setup** when hardware arrives — free plan, Cloud Sync on, auto-transcribe off, CLI install, minutes test.
3. **Stage 0** — Plaud MCP + Zoho MCP in Claude chat; prove summarize → deal note flow.

### Fork A build (Stage 1 — in Cursor)

Order small PRs; bump `FP_VERSION` per behavior change.

| Phase | Deliverable |
|-------|-------------|
| A1 | This doc + changelog updates | Done (#91) |
| A2 | Netlify `submit-recording` + `transcript-ready` skeleton | Done (v202 PR) |
| A3 | Inbox tab shell — workflow card, list, badge | Done (v202 PR) |
| A4 | Link-to-deal UI + local staging record | Done (v202 PR) |
| A5 | AssemblyAI integration + Pending Sync for failed steps | Planned |
| A6 | Claude summarize + Zoho save from Inbox | Partial (v202 — manual transcript + summary) |
| A7 | Field test Inbox path; program review checklist section | After v202 merge |

### Fork B (deferred)

Diary store, Voyage embeddings, pgvector (Supabase/Neon), nightly digest, RAG search — **separate spec when Fork A is boring in the field**.

---

## First-day Note Pro checklist (when device arrives)

- [ ] Create free Starter plan account
- [ ] Enable **Cloud Sync**
- [ ] Disable Plaud auto-transcribe if available
- [ ] Run short test recording; confirm sync to cloud
- [ ] Install Plaud CLI / confirm MCP access
- [ ] Stage 0: one recording → MCP summarize → Zoho deal note manually

---

## Costs (recap)

| Item | Estimate |
|------|----------|
| Plaud Note Pro | ~$189 one-time |
| Plaud subscription | $0 (Starter + our transcription) |
| AssemblyAI | ~$0.17/hr; ~$7–14/mo at 40+ hrs |
| Claude (summarize) | Few dollars/mo at field volume |
| Fork A all-in | ~$8–17/mo |
| Fork B (+ diary layer) | ~$15–45/mo — deferred |

---

## Open decisions

| Item | Default / note |
|------|----------------|
| Tab label | **Inbox** (alternatives: Recordings, Voice) |
| Stage 1 start version | v202 after v201 merge |
| Fork B | Explicitly deferred in changelog |
| Separate cloud login | Declined — use Zoho Users for technician |

---

## Agent instructions

1. Read this file before any Inbox or Plaud-related code.
2. Do not build Fork B in CapStone UI without user approval.
3. New Inbox tab must follow `CAPSTONE_DEVELOPMENT_RULES.md` (workflow card, pending sync, drafts, docs, version bump).
4. Update `CAPSTONE_CHANGELOG_AND_ROADMAP.md` when phases complete or scope changes.
5. Prefer extending Pending Sync / Pending AI patterns over new queue systems.
