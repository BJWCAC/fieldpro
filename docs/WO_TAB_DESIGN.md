# CapStone WO Tab

The **WO** tab is the Zoho **Meetings** record, shown in CapStone as the day's work order. It is not a new CRM module.

```text
Last updated: 2026-09-01
Status: Accepted — first slice is the list + meeting record
Related: docs/CAPSTONE_DEVELOPMENT_RULES.md (Future tab rule)
```

---

## Model

```
Deal (the job)
  ├── Assets_and_Checklist  →  Equipments (what may be worked)
  ├── Meetings              →  one WO per meeting (when / who / where)
  └── Result modules        →  Result 1 / drawdown / cal cert, tied to the asset
```

- A **Deal** is the job. Every job gets a deal. A deal can have several meetings.
- A **WO is that meeting**, field for field, the same record as the Meetings module. One WO per meeting. Assets stay listed on the deal underneath; they do not split the WO.
- **Host** on the meeting is the technician. CapStone's existing technician picker (`Internal_Assets.Users` → `A.technician`) filters the list to that Host.
- **Meeting Status** is the status field. Default list is **Active**. Other statuses are selectable on the same control.
- **Who_Id** is the contact link. Host is not the contact.
- Certificates (Result 1, drawdown, calibration certificate) are **existing Zoho modules** whose result rows are tied to the asset being worked. First slice does not fetch or write them.

---

## Accepted calls

| Item | Call |
|------|------|
| Shape | Dedicated **WO** tab. The meeting *is* the WO. No new Work_Orders module. |
| One WO per | Meeting. Same record as Meetings. Assets listed from the deal, underneath. |
| Technician | Existing picker. Match **Host** (not Owner, not Participants). No Host match → the row is not theirs. |
| Meeting Status | Default **Active**. The filter is selectable so other statuses can be shown. Every meeting in the chosen status(es) is in the list — not a 7/14/30-day window. |
| Sort | Start of the day first (`Start_DateTime` ascending). Earliest meeting on top, then in schedule order. |
| Contact | `Who_Id` on the meeting. Open in Zoho. |
| Certificates | Existing Zoho modules tied to the asset. Later slice. Do not generate CapStone certificate PDFs in the first slice. |
| Walk-in | See below. First slice does not create meetings. Deals → Capture still works. |

---

## Walk-in (what that question meant)

Sometimes work happens with **no meeting on the calendar** — a call-in, an add-on while already on site, or a deal that was never scheduled. The question was only: should the technician still be able to pick that deal and use Capture, or should the WO tab create a meeting so every visit has a calendar row?

**First slice:** do not create meetings from CapStone. **Deals → Capture stays.** A WO is not required to document a visit. If you later want every visit on the calendar, we can add "create a meeting" on the WO tab.

---

## List

This tab is the technician's calendar, the way they already look at Zoho.

- Refresh from Zoho (own button). Cache in `localStorage` (`fp_work_orders`) so the list opens offline.
- No technician selected → existing technician prompt; do not show the shop calendar.
- **Meeting Status** chips/select: default Active; tap to include other values from the Meetings picklist.
- Cards: account, meeting title, start time, venue, Host, status, deal name. Day headers (`Today`, `Mon Sep 1`).
- Sort: `Start_DateTime` ascending inside the current status filter.
- Badge = count after Host + status filters.
- Map keeps its own upcoming + coordinates view. The WO list does not require a pin.

How Host matches: normalize the picklist name and `Host.name` (trim, collapse spaces, case-fold). `Brad White` will not match `Bradley White` until the names agree in Zoho.

---

## Record (the open WO)

The meeting, as it is in Zoho:

- Title, start / end, venue, Host, Meeting Status, description
- Cancelled flag if Zoho set `$event_cancelled`
- Links: **Deal**, **Account**, **Contact** (`Who_Id`), **Meeting in Zoho**

Primary action: **Work this WO** — sets `A.wo` and the linked deal (`A.sel`), goes to Capture. Secondary: **Open assets on this deal**.

Assets on the open WO come from that deal's `Assets_and_Checklist`. Later: Result 1 / drawdown / cal cert rows for those assets.

---

## Tab placement and first slice

Tab order: **Deals · WO · Map · Capture · …**

First slice (this build):

1. `zoho-proxy` `get_meetings` + Meeting Status picklist (Meetings module first; Events fallback). Fields include Host, Who_Id, Meeting Status, What_Id.
2. WO tab: list, status filter, Host filter, start-of-day sort, open record, Zoho links, Work this WO.
3. RBAC toggle, header shows the selected meeting, technician change refilters.
4. Capture is not blocked when no WO is selected.

Not in the first slice: create a meeting, History `meetingId`, asset checkboxes, Result 1 / drawdown / cal cert fetch.
