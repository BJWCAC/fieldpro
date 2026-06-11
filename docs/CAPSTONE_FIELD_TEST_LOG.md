# CapStone Field Test Log

Use this log when running `CAPSTONE_PROGRAM_REVIEW_CHECKLIST.md` on a real Android device.

**Recording on hold** — complete field testing first; training video can follow after script review.

```text
Tester:
Device:
Chrome version:
Test build URL: https://BJWCAC.github.io/fieldpro/FieldPro.html?v=201
Test date:
Signal conditions: (good / poor / offline portions)
```

---

## How to use

1. Open the checklist: `docs/CAPSTONE_PROGRAM_REVIEW_CHECKLIST.md`
2. Work through each section on the device.
3. Check boxes in the checklist file or note pass/fail here.
4. Log bugs under **Findings** with enough detail for a small fix PR.
5. Share this file (or the findings section) when requesting fixes.

---

## Priority scenarios (v196–v198)

Run these even if the full checklist is done in multiple sessions.

### A. Poor signal + many photos

| Step | Pass | Notes |
|------|------|-------|
| Select deal, add 10–15 photos with labels | | |
| Confirm amber storage warning at 8+ photos | | |
| Confirm auto local History save (draft status) | | |
| Tap Save Locally — confirm History chip | | |
| Generate report on weak signal | | |
| Confirm work not lost if Zoho save fails | | |
| Reopen from History — photos and notes intact | | |

### B. Phone Downloads backup

| Step | Pass | Notes |
|------|------|-------|
| Settings: phone photo backup ON | | |
| Snap photo during video — Downloads copy | | |
| Add gallery photo — Downloads copy | | |
| Save All Photos to Phone | | |
| Save to Phone on single photo card | | |

### C. Photo labels on Android

| Step | Pass | Notes |
|------|------|-------|
| Type photo label — keyboard stays open | | |
| Type photo description — keyboard stays open | | |
| Label appears in WorkDrive filename preview | | |

### D. Asset search (v198)

| Step | Pass | Notes |
|------|------|-------|
| Search by partial brand | | |
| Search by partial type or series | | |
| Load existing asset — form populates | | |
| Save update — Deal Instrument_Description refreshes | | |

### [x] Field → AI spins and fails on weak basement signal (v200)
- Tab/screen: Capture → Report Sections / Voice Notes → → AI
- Steps: dictate with Wispr in basement (weak/no cell) → tap → AI on a field
- Expected: AI polishes text or queues for later without losing dictated content
- Actual (v200): spinner runs long then fails; raw dictation kept but no queue/retry
- Fix: v201 — → AI buttons + Pending AI queue (Settings → Retry AI when back online)

### F. Pending AI (v201)

| Step | Pass | Notes |
|------|------|-------|
| Load existing asset | | |
| Replace Instrument — enter new model/serial | | |
| Save — same Equipment record updated | | |
| Replacement card visible in Asset History panel | | |
| Equipment + Deal update notes created | | |

---

## Findings (bugs and gaps)

### [x] History reopen — autosave status unclear offline (v198)
- Tab/screen: History → Open + Continue → Capture
- Steps: offline → Save Locally → reopen via Open + Continue → edit without tapping Save Locally
- Expected: status shows work is in History; edits autosave within a few seconds
- Actual (v198): reopen did not show autosave until Save Locally tapped
- Fix: v199 — show “Opened from History” status and start draft/History autosave on continue

Add one block per issue:

```text
### [ ] Issue title
- Tab/screen:
- Steps to reproduce:
- Expected:
- Actual:
- Signal/network:
- Severity: (blocker / major / minor)
- Suggested fix:
```

---

## Section summary

| Checklist section | Pass | Fail | Skipped | Notes |
|-------------------|------|------|---------|-------|
| 1. Global navigation | | | | |
| 2. Deals | | | | |
| 3. Capture | | | | |
| 4. Assets | | | | |
| 5. Report | | | | |
| 6. History | | | | |
| 7. Settings | | | | |
| 8. Pending Sync | | | | |
| 9. Cross-tab consistency | | | | |
| 10. Android-specific | | | | |

---

## Sign-off

```text
Overall result: (pass with notes / pass / fail — blockers found)
Ready for training video recording: (yes / no — after fixes)
Tester signature / date:
```
