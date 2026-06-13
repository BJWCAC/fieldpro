# Track A — Field test runbook (Android)

Focused field test for **poor-signal Capture** and **Pending AI (v201)**. Run on a real Android phone in the field or simulating weak signal at the office.

**Test URL:** `https://BJWCAC.github.io/fieldpro/FieldPro.html?v=206`

**Log results in:** `docs/CAPSTONE_FIELD_TEST_LOG.md` (sections A, F, and Findings)

**Full checklist (optional):** `docs/CAPSTONE_PROGRAM_REVIEW_CHECKLIST.md`

```text
Last updated: 2026-06-08
Estimated time: 45–90 min (can split across two sessions)
Prerequisites: technician set, API key in CapStone, deals refreshed
```

---

## Before you start (5 min)

Fill in the header at the top of `CAPSTONE_FIELD_TEST_LOG.md`:

```text
Tester: [your name]
Device: [e.g. Samsung Galaxy S24]
Chrome version: [Chrome → Settings → About]
Test build URL: https://BJWCAC.github.io/fieldpro/FieldPro.html?v=206
Test date: [today]
Signal conditions: [good / poor / offline portions]
```

- [ ] Open CapStone v206 in **Chrome** (not Claude, not Plaud)
- [ ] **Settings** → confirm technician selected
- [ ] Tap **KEY** in header → Anthropic API key set (for → AI and Generate Report)
- [ ] **Deals → Refresh from Zoho** → select a **test deal** (not a live customer if possible)
- [ ] Confirm header shows correct account/deal

### Simulating poor signal (if not already in a dead zone)

Pick one method:

- **Airplane mode ON** for offline portions, then **Wi‑Fi only** (weak) or **mobile data** for “return online”
- **Basement / metal building** with 1 bar LTE
- Do **not** use airplane mode for the whole test — Section A needs “weak signal” for Generate Report, not fully offline

---

## Session 1 — Section A: Poor signal + many photos (~30 min)

Goal: prove Capture **does not lose work** when Zoho or AI is unavailable.

### Steps (check Pass in field test log section A)

1. **Select deal** on Deals tab → go to **Capture**
2. **Get Location** once
3. Add **10–15 photos** (Snap or Add Photos from gallery)
   - Add a **label** on at least 2 photos (keyboard should stay open while typing)
4. At **8+ photos**, confirm **amber storage warning** appears
5. Type a few words in **Site Visit Summary** (section 1)
6. Confirm **draft saved** status line appears (or tap **Save Locally to History**)
7. Switch to **History** — confirm new entry with photo count chip
8. **Simulate weak signal** (1 bar or throttle Wi‑Fi)
9. On Capture, tap **→ AI** on one section field
   - **Pass:** queues to Pending AI (toast or Settings shows item) — not infinite spinner
10. Tap **Generate AI Report** on weak signal
    - **Pass:** report generates OR queues to Pending AI with clear message
11. Go to **Report** → **Save Report to Zoho** on weak signal
    - **Pass:** fails gracefully → **Pending Sync** in Settings (not silent loss)
12. **Restore good signal** (or Wi‑Fi)
13. **Settings → Pending AI → Retry** (if items queued)
14. **Settings → Pending Sync → Retry** (if items queued)
15. **History → Open + Continue** on your test visit
    - **Pass:** photos, notes, sections restored
16. Edit a section → confirm draft/History autosave status within ~10 sec

### Pass criteria

- No lost photos or notes after steps 15–16
- Pending AI and Pending Sync recover after signal returns

---

## Session 2 — Section F: Pending AI (~20 min)

Goal: per-field **→ AI** and **Generate Report** / **Extract with AI** queue and retry.

### Capture → AI

1. **Capture** → pick a section with text (or dictate a short note)
2. Turn **airplane mode ON** (fully offline)
3. Tap **→ AI** on that section
   - **Pass:** “queued” / Pending AI message — not stuck loading forever
4. Airplane mode **OFF**, wait for signal
5. **Settings → Pending AI** → **Retry** or wait for auto-retry
   - **Pass:** field text updates or clear error

### Generate Report offline

6. **Capture** with deal + some notes/photos
7. Airplane mode **ON**
8. **Generate AI Report**
   - **Pass:** queues to Pending AI (not blank failure)
9. Airplane mode **OFF** → retry from Settings or Capture

### Assets Extract offline

10. **Assets** → add a nameplate photo (or use existing)
11. Airplane mode **ON**
12. **Extract with AI**
    - **Pass:** queues to Pending AI
13. Airplane mode **OFF** → retry

Check off each row in field test log **section F**.

---

## Session 3 — Quick sanity pass (~15 min, optional same day)

Already validated — quick confirm still works:

| Area | One check |
|------|-----------|
| **Inbox / Plaud** | Upload Audio → Transcribing → transcript → Save to Zoho |
| **Deals** | Search filter + select deal |
| **Assets** | Search existing asset by partial name |
| **Settings** | Pending Sync count matches expectations |

---

## Log bugs

For anything that fails, add a block under **Findings** in `CAPSTONE_FIELD_TEST_LOG.md`:

```text
### [ ] Short title
- Tab/screen:
- Steps to reproduce:
- Expected:
- Actual:
- Signal/network:
- Severity: blocker / major / minor
```

Share findings in chat or open a fix PR per issue.

---

## Sign-off

When A and F are complete, fill in **Section summary** and **Sign-off** at the bottom of the field test log.

**Track A complete when:**

- [ ] Section A — all steps Pass or documented as Findings
- [ ] Section F — all steps Pass or documented as Findings
- [ ] No **blocker** findings open (major/minor can wait for small PRs)

Then: training video can be scheduled; Plaud Stage 2 auto-pull can be prioritized in dev.
