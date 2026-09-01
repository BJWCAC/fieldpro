# CapStone WO Tab — Design Notes

Ideas for a **WO** (Work Order) tab. This is a design draft, not a build plan that has been accepted yet.

```text
Last updated: 2026-09-01
Status: Ideas for review — two list rules are accepted (technician filter, start-of-day first)
Related: docs/CAPSTONE_DEVELOPMENT_RULES.md (Future tab rule)
```

---

## What you described

- A **Deal** is the job. Every job gets a deal.
- A deal can have **several meetings**. The meeting is the scheduling record — when, where, who — pulled from the deal and the account.
- The deal usually already lists the **assets** that will be worked. A calibration deal often has several. A troubleshooting deal may have one or several.
- When the technician works a scheduled meeting, the usual product is a **certificate**: a calibration certificate, a Result 1, a drawdown, or another certificate type.
- The WO tab should hold **the meeting itself** — the same fields the meeting already has — plus links to the **deal**, the **account**, and the **contact**.

That last sentence is the load-bearing one: the work order is not a new kind of CRM record. It is the meeting, shown in CapStone as the day's ticket.

**Accepted list rules (2026-09-01):**

- Technicians open this tab the way they open the Zoho calendar: **what is scheduled for me today**.
- The list uses the **existing technician selection** (`A.technician` / Settings / boot prompt, from `Internal_Assets.Users`). It is not a second login.
- Meetings are listed in **date and time order, start of the day first** (start datetime ascending). The earliest meeting of the day is at the top, then the rest in schedule order.

---

## How CapStone works today (the gap)

| Surface | What it knows | What it does not know |
|---------|---------------|------------------------|
| **Deals** | The job. Selecting a deal sets `A.sel` and every later save (Capture, Assets, Report, WorkDrive) hangs off that deal. | Which meeting on that deal is today's visit. |
| **Map** | Upcoming Zoho Events/Meetings as purple pins. Already joins meeting → deal or account, then to site coordinates. | Past or in-progress meetings. Contact (`Who_Id`). Meetings without a mapped location. The visit you are about to work. |
| **Capture / Report / History** | One visit, filed on one deal (or copied to other deals). | Which meeting the visit fulfilled. |
| **Assets** | Equipments on the account; linking writes the deal's `Assets_and_Checklist` subform. | Which of those assets this meeting is supposed to cover. |

The Map already talks to Zoho Events (and falls back to Meetings). `get_map_events` asks for title, start/end, `What_Id`, venue, location, `$se_module`, and `$event_cancelled`. It does **not** ask for `Who_Id` (contact), Participants, Description, or Owner. It also drops anything whose end time is in the past, and anything that cannot be pinned on the map. That is correct for a map. It is not enough for a work-order list.

```
Deal (job)
  ├── Assets_and_Checklist  →  Equipments (what may be worked)
  ├── Meetings / Events     →  scheduled visits (when / who / where)
  └── Notes + PDFs          →  CapStone reports, filed on the deal

Today CapStone enters at the Deal.
The WO tab would enter at the Meeting, then walk to the same Deal.
```

---

## Three ways to build it

### A — The meeting *is* the work order (recommended)

The WO tab lists Zoho Events/Meetings. Opening one shows the meeting record and the same lookups Zoho already keeps: Deal (`What_Id` when `$se_module` is Deals), Account (from the deal, or `What_Id` when the meeting is on the account), Contact (`Who_Id`). Links open those records in Zoho, the way Map already opens a meeting.

Selecting a WO also selects that deal (`A.sel`), so Capture, Assets, and Report keep working without a second pick. A new `A.wo` (or `A.meeting`) holds the meeting so the header can say *which visit* on that deal this is.

**Why this fits.** You asked for the meeting information in the tab "just like the meeting itself," with links to deal, account, and contact. Those links already live on the meeting. No new Zoho module. The Map's event fetch is the starting point; it needs a sibling that is allowed to be past, unmapped, and contact-aware.

**Cost.** Proxy field list grows. Capture/History later store a `meetingId` so two visits on the same deal stay distinct. Tab bar gets one more item (already Deals / Map / Capture / Assets / IA / Inbox / Report / History / Settings).

### B — A new Zoho Work_Orders module

A custom module that copies the meeting and adds certificate-type fields, asset checkboxes, and status. CapStone would create and update those records.

**When this is worth it.** Only if a meeting cannot carry what you need — for example a WO that exists with no meeting, or certificate fields that must be first-class CRM columns searchable in Zoho reports.

**Cost.** CRM schema work, sync in both directions, and a second record to keep aligned with the meeting you already create. Heavier than the request as written.

### C — No new tab: meetings hang under the Deals tab

Each deal card expands to its meetings. Tapping a meeting opens a WO detail pane. Same data as A, no extra tab.

**Tradeoff.** Fewer tabs, but the day's work is meeting-shaped, not deal-shaped. A calibration deal with three site visits is three work orders. Finding "what am I doing this morning" from a deal list is the long way around. You asked for a tab; C is the fallback if the tab bar is already too tight on a phone.

---

## Recommended shape (Approach A)

Treat **WO = this meeting**. The deal stays the job. The assets stay on the deal. The certificates stay the work product of *this* meeting.

```
WO tab
  list of meetings (today / upcoming / recent)
       │
       ▼
  WO record (the meeting)
       ├── when / where / title / owner  (meeting fields)
       ├── Deal ↗   Account ↗   Contact ↗   Meeting in Zoho ↗
       ├── assets on that deal (from Assets_and_Checklist)
       └── work on this visit (later: certificates, Capture, History)
```

### List

This tab is the technician's **calendar for the day**, not a second Deals list.

Same card language as Deals: account on top, meeting title as the name, meta chips for when, venue, deal stage, assigned technician. Day headers (`Today`, `Tomorrow`, `Mon Sep 1`) so a 4pm yesterday and an 8am today do not blend. Badge = count in the current window after the technician filter.

**Sort (accepted):** `Start_DateTime` ascending — start of the day first, then the rest in schedule order. An 8am today sits above a 2pm today; today sits above tomorrow. This is the working calendar, not a newest-first inbox.

**Technician filter (accepted):** default list is meetings scheduled for the signed-in technician. Reuse `A.technician` (saved in `fp_technician`). Changing the picker in Settings or the boot prompt refilters immediately. No technician selected → do not show everyone else's calendar; show the same empty state as Capture's missing context ("Select a technician to see your scheduled work") and the existing technician prompt. An **All technicians** chip can exist for admin later; it is not the default.

How a meeting counts as "theirs":

CapStone's technician list is **display names** from the `Internal_Assets.Users` picklist (`get_technicians`). It is not a Zoho user id. Meetings carry `Owner` as `{id, name}`. Match the picklist name to `Owner.name` after a light normalize (trim, collapse spaces, case-fold). Also match if that name appears as a **user** Participant — the calendar often invites the tech while a dispatcher stays Owner.

If the picklist says `Brad White` and Zoho Owner is `Bradley White`, the row will not match until someone aligns the names in Zoho or we add a later user-id map. First slice does not invent nicknames. Unmatched rows stay out of the default list; they are not deleted from the cache.

Fetch: pull meetings for the date window with `Owner` (and Participants) on the record, then filter on the device. A later improvement can resolve the picklist name to a CRM user id and use Zoho criteria so the proxy returns a smaller page.

Default date window stays **Today** (the calendar they already look at). Upcoming and a short look-back remain available as chips; sort is still start-of-day first inside whatever window is on.

Refresh is its own button, like Deals. Cache in `localStorage` (`fp_work_orders`) so the list opens offline the way deals already do. Map can keep its own upcoming-only, location-required view; do not make the WO list depend on geocoding.

### Record (the open WO)

A workflow card at the top, per the Future tab rule. Then the meeting, verbatim enough that a technician recognizes it as the same record they see in Zoho:

- Title
- Start / end
- Venue / location
- Owner (assigned tech)
- Description / agenda if Zoho has one
- Cancelled flag (show it; do not hide a cancelled meeting that is still in the window)

Lookup row, each a Zoho link plus a CapStone action:

| Link | Source on the meeting | CapStone action |
|------|------------------------|-----------------|
| **Deal** | `What_Id` when related to Deals; else the account's active deal | Select that deal (`A.sel`) |
| **Account** | Deal's account, or `What_Id` when related to Accounts | Shown; Assets already knows the account |
| **Contact** | `Who_Id` (and Participants if you use more than one) | Open in Zoho. CapStone has no Contacts tab today. |
| **Meeting** | The event id | Open in Zoho (same URL helper Map already uses) |

Primary action: **Work this WO** — sets `A.wo` + `A.sel`, goes to Capture. Secondary: **Open assets on this deal**.

### Assets on the WO

Do not invent a second asset list. Read the deal's `Assets_and_Checklist` (already written when an asset is saved against the deal). Show AMD number, name, brand, type. A calibration meeting with six instruments is six rows. A troubleshooting meeting with one is one row.

Later — not in the first slice — a checkbox per asset: "worked this visit." That is how one meeting on a multi-asset deal stays honest without splitting the deal.

### Certificates (later)

You named calibration certificate, Result 1, drawdown, and other types. CapStone today produces a **service report** (PDF + deal note + WorkDrive). It does not generate those certificate forms.

First slice: do not generate certificates. Show a **Work on this visit** block that lists History records already tagged to this meeting (empty until Capture stores `meetingId`). The certificate *types* become a later phase once we know whether they are existing Zoho modules, existing PDF templates, or new CapStone forms.

---

## How it would sit next to the other tabs

```
Today:     Deals → (pick job) → Capture / Assets → Report → History
With WO:   WO    → (pick this visit) → same Capture / Assets / Report
           Deals stays for "I know the job, not the meeting"
           Map stays for "where is today's work"
```

Suggested tab order: **Deals · WO · Map · Capture · …** — pick-context tabs together, then do-the-work tabs.

Selecting a WO sets the deal. Selecting a deal from the Deals tab does **not** have to pick a meeting (walk-in, or a deal with no meeting yet). Capture's "No deal linked" bar stays. A later "No WO linked" hint is optional and must not block Capture — some work is not on a scheduled meeting.

Header today shows account + deal. With a WO selected it should also show the meeting title and start time, so two visits on the same deal cannot be confused.

---

## What would have to change in code (when you say go)

No code in this PR. When an approach is accepted, the first slice is roughly:

1. **`zoho-proxy`**: a `get_meetings` (or widened `get_map_events`) that returns `Who_Id`, Participants, Description, **Owner**, and does not require coordinates. Keep the Map action as the upcoming/located subset, or share one fetch and filter in each tab.
2. **`FieldPro.html`**: tab button, pane, workflow card, help box, list + record layout. Cache-bust + `FP_VERSION`.
3. **`src/app.js`**: `A.wo`, load/cache/render, filter by `A.technician` against Owner / user Participants, sort by `Start_DateTime` ascending, `selectWorkOrder()` that also calls `selectDeal`, RBAC toggle (`RBAC_TAB_TOGGLES`), `go('wo')`. Changing `saveTechnicianSetting()` must re-render the WO list.
4. **Header / Capture**: show meeting context when `A.wo` is set. Do not require it.
5. **Docs**: Future tab checklist, changelog, this file marked accepted.

History `meetingId` and the asset-checkbox / certificate blocks are a second slice. They touch `HISTORY_CONTENT_KEYS`, Capture draft, and copy-to-other-deals, so they should not ride along with the first list/record.

---

## What not to do in the first slice

- Do not create a Zoho Work_Orders module.
- Do not generate Result 1 / drawdown / calibration certificate PDFs.
- Do not make Capture refuse to run without a meeting.
- Do not reuse Map's "upcoming + has coordinates" filter as the WO list.
- Do not drop captured data to "clean up" a customer-facing certificate later — same render-time filter rule as reports if a customer-facing cert is ever added.

---

## Decided

| Item | Call |
|------|------|
| Technician filter | Required. Use the existing technician selection. Default list = that technician's meetings only. No technician selected → prompt, do not show the full shop calendar. |
| Match field | `Owner.name` (and user Participants) against the `Internal_Assets.Users` display name. Not a new login. |
| Sort | Date and time, **start of the day first** (`Start_DateTime` ascending). Earliest meeting on top, then in schedule order. |
| Day view | This tab is their calendar for the day. Default window **Today**. |

## Open questions (need your call)

1. **Is every Zoho meeting a work order**, or only some types / titles / pipelines (calibration vs service vs internal)?
2. **Contact**: is `Who_Id` the one contact, or do you routinely put several people on Participants?
3. **How far back** should chips other than Today reach — last 7 days, 14, 30, or "this deal's meetings, any date"?
4. **Walk-in / emergency** with no meeting: stay on Deals → Capture, or should WO allow "create a meeting from here"?
5. **Certificates**: are Result 1, drawdown, and calibration cert existing Zoho records or PDF templates, or do you want CapStone to write them later?
6. **One WO per meeting, or one per asset?** A six-instrument calibration on Tuesday afternoon is one meeting. Is that one work order with six assets, or six work orders?
7. **Tab vs under Deals** — confirm you still want a dedicated **WO** tab (Approach A) rather than Approach C.
8. **Owner vs calendar invite** — when a dispatcher owns the meeting and the tech is only invited, should that row still show (current yes: match Participants too)?

The recommendation, if you do not want to think about it further: **Approach A, one WO per meeting, assets listed from the deal, certificates later, walk-ins still allowed without a WO, default list = today for the signed-in technician, start-of-day first, contact = `Who_Id`.**
