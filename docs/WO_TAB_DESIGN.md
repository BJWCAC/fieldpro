# CapStone WO Tab

The **WO** tab is the Zoho **Meetings** record, shown in CapStone as the day's work order. It is not a new CRM module.

```text
Last updated: 2026-09-02
Status: Accepted — list + editable meeting form (Zoho write-back)
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
- **Users** on the meeting is the technician — the same Settings **User / Technician** picklist (`Internal_Assets.Users` / Current User → `A.technician`). Host and Owner are fallbacks. CapStone matches any of Users, Technician, Host, Owner.
- **Meeting Status** is the status field. Default list is **all statuses**. Chips narrow it; many calendars use Planned or Scheduled, not Active.
- **Who_Id** is the contact link. Host is not the contact.
- Certificates (Result 1, drawdown, calibration certificate) are **existing Zoho modules** whose result rows are tied to the asset being worked. First slice does not fetch or write them.

---

## Accepted calls

| Item | Call |
|------|------|
| Shape | Dedicated **WO** tab. The meeting *is* the WO. No new Work_Orders module. |
| One WO per | Meeting. Same record as Meetings. Assets listed from the deal, underneath. |
| Technician | Existing Settings **User / Technician** picker. **My meetings** matches Users, Technician, Host, and Owner. **All hosts** shows everyone. |
| Meeting Status | Default **all statuses**. Chips narrow it. |
| Dates | From / To pickers plus **Today**. Default is 14 days back through 60 days forward. This is the Zoho window — separate from Meeting Status. |
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
- **Dates:** From / To pickers plus a **Today** button. Default window is 14 days back through 60 days forward. Changing dates (or Today) asks Zoho for that window. Active is still Meeting Status — not the same as Today.
- **Meeting Status** chips/select: default all statuses; tap a chip to narrow.
- Cards: account, meeting title, start time, venue, User / Technician, status, deal name. Day headers (`Today`, `Mon Sep 1`).
- Sort: `Start_DateTime` ascending inside the current status + date filters.
- Badge = count after User / Technician + status + date filters.
- Map keeps its own upcoming + coordinates view. The WO list does not require a pin.

How the technician matches: **My meetings** is the setup / Settings **User / Technician** name (`A.technician`, Internal_Assets.Users) against `Users`, `Technician`, `Host`, and `Owner` on the meeting — not Host alone. Users may be a picklist string, a lookup `{name}`, or an array of those. Normalize (trim, punctuation, case-fold). A first name matches `First Last`. `Brad White` matches `White, Brad` and `Bradley White`. An email matches on the local part. **All hosts** shows every meeting in the date window. **All statuses** is the default so Planned/Scheduled calendars are not hidden.

---

## Record (the open WO)

Opening a meeting shows the **same Zoho Meetings fields** as an editable form (`#wo-record`), **prefilled with that meeting's current values**. Field **labels** are Zoho `field_label` (the name on the Meetings layout). Metadata comes from `get_meeting_fields`; the record comes from `get_meeting` (layout GET first, then any missing requested fields). The list row keeps the raw Zoho record so custom fields still seed the form offline. Fallback labels match Zoho: Meeting Title, From, To, All day, Users, Contact Name, Related To, Meeting Owner.

- Every shown field has **→ AI**. Typed text is polished; an empty field is drafted from this meeting (and Capture voice notes when present). Picklists must land on a listed option.
- **Save meeting to Zoho** PUTs only changed editable fields via `update_meeting`. Lookups (Host, Contact Name, Related To, Meeting Owner) stay read-only. Failed saves queue as Pending Sync `meeting_update`.
- Local draft: `fp_wo_draft` (autosave on edit, restore when the same meeting is reopened).
- Cancelled flag if Zoho set `$event_cancelled`
- Links: **Deal**, **Account**, **Contact** (`Who_Id`), **Meeting in Zoho**

Primary action: **Save meeting to Zoho**. **Work this WO** — sets `A.wo` and the linked deal (`A.sel`), goes to Capture. Secondary: **Open assets on this deal**.

Assets on the open WO come from that deal's `Assets_and_Checklist`. Later: Result 1 / drawdown / cal cert rows for those assets.

---

## Tab placement and first slice

Tab order: **Deals · WO · Map · Capture · …**

First slice (this build):

1. `zoho-proxy` `get_meetings` + Meeting Status picklist (Meetings module first; Events fallback). Fields include Host, Who_Id, Meeting Status, What_Id.
2. WO tab: list, status filter, User / Technician filter, start-of-day sort, open record, Zoho links, Work this WO.
3. Open meeting form: live Meetings fields, per-field → AI, Save to Zoho (`get_meeting_fields` / `get_meeting` / `update_meeting`).
4. RBAC toggle, header shows the selected meeting, technician change refilters.
5. Capture is not blocked when no WO is selected.

In this slice: live meeting field form, prefilled from the Zoho record, Zoho field labels, per-field → AI, Save to Zoho, `fp_wo_draft`, Pending Sync `meeting_update`. Proxy build **296** (`get_meeting_fields`, `get_meeting` layout-first, `update_meeting`).

Not in this slice: create a meeting, History `meetingId`, asset checkboxes, Result 1 / drawdown / cal cert fetch.
