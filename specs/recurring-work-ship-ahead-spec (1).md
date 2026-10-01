# Recurring Work – Ship-Ahead Materials Automation
Implementation spec for Cursor · Calibrations & Controls (CAC) · Zoho One

## 1. Goal

Some recurring service visits need materials ordered and shipped to the customer site before the technician arrives. For example, TE Connectivity in San Francisco needs test gas shipped ahead every visit. This automation makes sure that:

1. Materials get ordered on time. A draft Zoho Books PO is created automatically and Brad approves it.
2. The customer knows a shipment is coming and holds it for the tech.
3. The technician knows materials are on site. A notice goes on the meeting and a Cliq message is sent.
4. Leftover stock is recorded so the next order is right.

Everything is language: **Deluge** (Zoho CRM custom functions + one Zoho Books custom function).

## 2. Existing system (do not break)

The `Recurring_Work` custom module already exists with auto-programming:

| Label | API name | Notes |
|---|---|---|
| Name | `Name` | e.g. "Calibrations Semi - Annual Gas Detectors" |
| Account | `Account` | lookup → Accounts |
| Kickoff Service Date | `Next_Service_Date` | 15th of the month **before** the service month. Existing function creates the Deal on this date and rolls it forward. |
| Generate Time Span (Months) | `Generate_Time_Span_Days` | Months to roll forward (label says months, API name says days) |
| Frequency | `Frequency` | picklist |
| Month | `Pick_List_1` | Service month |
| Active | `Active_Inactive` | boolean |
| Contact On-Site | `Contact_On_Site` | lookup → Contacts. Only filled when the on-site contact differs from `Contacts`. **Site contact rule everywhere: `Contact_On_Site` if filled, else `Contacts`.** |
| Work Site Prep | `Work_Site_Prep` | textarea |
| Tech notes | `Technician_Service_Notes` | textarea |
| Manually send to deal | `Manually_send_to_deal` | picklist |
| Products / Tools | `Products_Tools` | subform: `Products` (lookup → Products), `Quantity` (double), `Ship_Ahead` (boolean, NEW) |

Other Recurring_Work fields used by the kickoff scripts: `Contacts` (lookup → Contacts; becomes Deal `Contact_Name`), `Technician` (label "Preferred Technician", **user lookup**, currently hidden from the layout), `Customer_PO`, `Amount`, `Service_Type` ("On Site" / "Mail In Lab"), `Assets_and_Products` (subform → Deal `Assets_and_Checklist`).

**Existing kickoff scripts** (in `/deluge/recurring-work/`):

| File | Function | Trigger |
|---|---|---|
| `kickoff_auto.dg` | `schedule.Create_Deal_Automation_Kickoff_Date()` | Daily schedule. Reads up to 2,000 RW records (10 pages × 200), picks those where `Next_Service_Date == today` and active. |
| `kickoff_manual.dg` | `button.Deal_Create_Single_Record(String Id)` | Button on the Recurring_Work record. Opens the new Deal when done. |

Both scripts do the same steps:
1. Build a Deal (Jobs layout `3631313000007898916`). Pipeline is Jobs `3631313000034293042` for On Site and InHouse Lab `3631313000136915992` for Mail In Lab. `Products_Tools` rows are copied into Deal subform `Time_Tracker` (Products + Quantity only).
2. Create it via `invokeurl` POST `/crm/v8/Deals` using connection **`zoho_pipeline_scope`**, with workflow triggers on.
3. Rename the Deal to `Name + " - " + Job_ID`.
4. Roll `Next_Service_Date` forward by `Generate_Time_Span_Days` months.

Meetings are **not** created by these scripts. They're created later, by hand or by another workflow.

Deal Stage values with category **Closed Won**: `Completed`, `Closed/Invoiced`, `Completed and Shipped`. Closed Lost: `Closed Lost`, `Cancelled by Customer`.

## 3. New fields (already created on 2026-09-30)

Verify exact API names with the CRM Fields API before coding. The expected names are:

| Module | Label | Expected API name | Type |
|---|---|---|---|
| Recurring_Work | Materials Status | `Materials_Status` | picklist: Not Required · PO Pending · Ordered · Shipped · Received on Site (default Not Required) |
| Recurring_Work | Tracking Number | `Tracking_Number` | text |
| Recurring_Work | Books PO Number | `Books_PO_Number` | text (comma-separated if more than 1 PO) |
| Recurring_Work | Leftover On Site | `Leftover_On_Site` | textarea |
| Products_Tools (subform) | Ship Ahead | `Ship_Ahead` | boolean (confirmed) |
| Deals | Preferred Technician | `Preferred_Technician` | user lookup (confirmed; matches existing kickoff script line) |
| Deals | Recurring Work Lookup | `Recurring_Work_Lookup` | lookup → Recurring_Work (confirmed; created so the kickoff scripts' existing line now works, see section 6A) |

## 4. Lifecycle (one cycle)

K = `Next_Service_Date` (Kickoff). V = the visit meeting's `Start_DateTime`.

| When | Trigger | Action | Status after |
|---|---|---|---|
| K − 30 days | Date-based workflow on Recurring_Work | `rw_prep_materials` → draft Books PO(s) + "Approve PO" task (due +3 days) | PO Pending |
| PO approved/issued in Books | Books workflow on Purchase Order status | Books function `po_issued_update_crm` | Ordered |
| Tracking Number entered | CRM workflow on edit (field updated, not empty) | `rw_materials_shipped` → customer email + Cliq to tech | Shipped |
| Meeting created | CRM workflow on Events create | `event_sync_materials` → notice in description + "Confirm received" task due V − 7 | (unchanged) |
| "Confirm received" task completed | CRM workflow on Tasks | `task_confirm_received` | Received on Site |
| Materials Status changes | CRM workflow on Recurring_Work field update | `rw_sync_meeting_notice` → refresh notice on all upcoming meetings | (unchanged) |
| V − 2 days | Date-based workflow on Events | `event_tech_job_summary` → Cliq job summary to tech | (unchanged) |
| Deal Stage → Closed Won | CRM workflow on Deals | `deal_closed_reset_materials` → reset status, clear Tracking/PO fields | Not Required |

**Criteria for every Recurring_Work workflow:** `Active_Inactive = true`. Records that existed before 2026-09-30 have `Materials_Status` **empty (null)**, not "Not Required". Treat null as "Not Required" everywhere.

**Recurring_Work_ID** is an existing auto-number field (e.g. `RW-589`). Use it as the human-readable reference on POs, tasks, and messages. Inside each function, exit early if no `Products_Tools` row has `Ship_Ahead = true`.

## 5. Functions

### Shared constants (put at top of each function or in a CRM variable)
```
BOOKS_ORG_ID  = "<<BOOKS_ORG_ID>>";
BOOKS_CONN    = "<<books_connection_name>>";   // reuse existing connection if present
CRM_CONN      = "zoho_pipeline_scope";        // existing connection used by the kickoff scripts
CLIQ_CHANNEL  = "<<fieldops_channel_unique_name>>"; // fallback when no tech assigned yet
APPROVER_ID   = "<<Brad CRM user id>>";
NOTICE_START  = "=== SHIP-AHEAD MATERIALS ===";
NOTICE_END    = "=== END MATERIALS ===";
```

### 5.1 `rw_prep_materials(rwId)`: K − 30 days
1. Get the Recurring_Work record. Exit if inactive or no `Ship_Ahead` rows.
2. For each Ship-Ahead row, get the Product record, which gives `Vendor_Name` (lookup → Vendors) and `Product_Code`.
   - Books Item: `zoho.books.getRecords("Items", BOOKS_ORG_ID, "sku=" + Product_Code, BOOKS_CONN)`. If there is no SKU match, fall back to a name match. If still not found, **do not guess**. Add the item to an `errors` list.
   - Books Vendor: `getRecords("Contacts", ..., "contact_type=vendor&contact_name=" + encodeUrl(vendorName))`.
3. Group rows by vendor. Create **1 PO per vendor**:
   ```
   po = Map();
   po.put("vendor_id", vendorId);
   po.put("reference_number", rw.get("Recurring_Work_ID"));  // auto-number like "RW-589"; used to find the RW record later
   po.put("line_items", lineItems);                  // [{item_id, quantity, description}]
   po.put("notes", "Ship to: " + accountName + ". Hold for CAC technician. Site contact: " + contactName);
   // VERIFY in Books API docs: deliver-to-customer field (delivery_customer_id) so the
   // PO delivery address is the customer's site, not CAC.
   resp = zoho.books.createRecord("PurchaseOrders", BOOKS_ORG_ID, po, BOOKS_CONN);
   ```
   Leave the PO in **Draft**. If Books PO approvals are enabled, submit it for approval instead. Never mark it issued or send it to the vendor.
4. Update Recurring_Work: `Materials_Status = "PO Pending"`, `Books_PO_Number = <comma-joined PO numbers>`.
5. Create a Task: Subject `"Approve PO – " + accountName + " – " + rw.Name`. Owner = APPROVER_ID. Due = today + 3 days. `What_Id` = rwId, `$se_module` = "Recurring_Work". Put the PO numbers, item list, and any `errors` in the Description.
6. If `errors` is not empty, also post to CLIQ_CHANNEL so a missing Books item is noticed that day.

### 5.2 `po_issued_update_crm` (Zoho Books custom function)
- Books workflow: Purchase Orders, on status change to **Issued/Open**.
- Parse `reference_number`. If it starts with `RW-`, find the CRM Recurring_Work record where `Recurring_Work_ID` equals it (CRM search, criteria `Recurring_Work_ID:equals:RW-589`) and set `Materials_Status = "Ordered"`.
- If the RW has more than 1 PO, only set Ordered when **all** its POs are issued. Check them via `Books_PO_Number`.

### 5.3 `rw_materials_shipped(rwId)`: Tracking Number entered
1. Set `Materials_Status = "Shipped"`.
2. **Customer email** to the site contact: use `Contact_On_Site` if it's filled in, otherwise `Contacts`. Brad only fills Contact On-Site when it differs from the main contact. If neither has an email, skip the email and post to Cliq. The subject is `"Materials shipping for your upcoming CAC calibration visit"`. The body covers:
   - The item list (product name × quantity)
   - The tracking number
   - "Please hold these items for our technician; do not open or put into service."
   - The service month
   Use an existing CRM email template if one fits, or `sendmail` from the org address.
3. **Cliq to tech**: pick the tech in this order: (a) the owner of the upcoming Event for this Account (section 5.6 helper), then (b) the RW `Technician` user lookup (or Deal `Preferred_Technician` once the Deal exists) (get the email via CRM Users API `GET /crm/v8/users/{id}` with CRM_CONN), then (c) post to CLIQ_CHANNEL. Send with `zoho.cliq.postToUser(email, msg)`. Message: account, items, tracking number, service month.

### 5.4 `event_sync_materials(eventId)`: Meeting created
1. Resolve the Account from the Event: `What_Id` (Deal) → Deal `Account_Name`, or directly if related to an Account.
2. Find active Recurring_Work records for that Account where `Materials_Status != "Not Required"`.
3. Write the notice block into the Event `Description` (see 5.7).
4. Create Task `"Confirm materials received on site – " + accountName`. Due = V − 7 days. If that's already past, use today. Owner = event owner (or office user). `What_Id` = rwId. The Description holds the tracking number and site contact phone.

### 5.5 `task_confirm_received(taskId)`: Task completed
- Workflow on Tasks: Status = Completed AND Subject starts with `"Confirm materials received"`.
- Set the linked Recurring_Work `Materials_Status = "Received on Site"`. That triggers 5.6.

### 5.6 `rw_sync_meeting_notice(rwId)`: Materials Status changes
- Find all Events for the RW's Account with `Start_DateTime >= now`. Use COQL: `WHERE` is required and pages at 200.
- Rewrite the notice block on each (5.7).
- Helper `get_upcoming_event(accountId)` returns the soonest one. It's used by 5.3 and 5.8.

### 5.7 Notice block format (idempotent)
Replace everything between NOTICE_START and NOTICE_END if present. Otherwise **prepend** it. Never touch the rest of the description.
```
=== SHIP-AHEAD MATERIALS ===
⚠ Status: Received on Site (confirmed 11/20)
Items: 2 × 50% LEL Methane cyl
Tracking: 1Z999...
Leftover from last visit: 1 cyl, exp 3/2027
=== END MATERIALS ===
```

### 5.8 `event_tech_job_summary(eventId)`: V − 2 days
- Date-based workflow on Events, 2 days before `Start_DateTime`. Criteria: a Ship-Ahead RW exists for the account. Check this inside the function.
- Cliq to event owner/participants: account, site address, visit time, site contact (`Contact_On_Site` if filled, otherwise `Contacts`; name + phone), Work Site Prep, `Technician_Service_Notes`, materials status + items + where they're stored, and equipment count from the Deal.
- Design the function so it can later run for **all** visits, not only Ship-Ahead ones. Put the Ship-Ahead check behind a flag.

### 5.9 `deal_closed_reset_materials(dealId)`: Deal closed
- **Do not** reset Materials Status when `Next_Service_Date` rolls forward at kickoff. Kickoff happens before the visit, so the status must survive.
- New CRM workflow on Deals: Stage changes to any **Closed Won** value (`Completed`, `Closed/Invoiced`, `Completed and Shipped`) AND `Recurring_Work_Lookup` is not empty.
- Reset the linked Recurring_Work: `Materials_Status = "Not Required"`, clear `Tracking_Number` and `Books_PO_Number`. Keep `Leftover_On_Site`, since the tech updates it at job close.
- If `Recurring_Work_Lookup` is empty (Deals created before the fix in 6A), do nothing and post to CLIQ_CHANNEL so it can be reset by hand. Don't match by name.
- **Next-order adjustment (phase 2, optional):** in 5.1, if `Leftover_On_Site` is filled, include it in the Approve PO task description so Brad can reduce quantity before approving. Do not auto-reduce.

## 6A. Required fixes to the existing kickoff scripts

Make only these changes, and apply each to **both** `kickoff_auto.dg` and `kickoff_manual.dg` unless noted. Leave all other logic alone.

1. **Deal → Recurring Work link (auto script only).** `dealmap.put("Recurring_Work_Lookup",input.Id);` uses `input.Id`, but the scheduled function has no input argument. Change it to the loop variable: `dealmap.put("Recurring_Work_Lookup",Id);`. The manual script's `input.Id` is correct. Note: until 2026-09-30 the `Recurring_Work_Lookup` field didn't exist on Deals, so this line was silently ignored in both scripts. Existing Deals have it empty.
2. **Preferred Technician on Deals.** The field `Preferred_Technician` (user lookup) was created on Deals on 2026-09-30, so the existing `dealmap.put("Preferred_Technician", ...)` line now saves. Before that, it was silently dropped, so older Deals have it empty. No code change is needed beyond the null guard in item 3.
3. **Null technician guard.** `getTechnician = ifnull(getRecurring.get("Technician"),"");` then `getTechnician.get("id")` will fail or misbehave when Technician is empty, which is common. Replace it with:
   ```
   techObj = getRecurring.get("Technician");
   if(techObj != null) { dealmap.put("Preferred_Technician", techObj.get("id")); }
   ```
4. **Copy Ship Ahead flag (optional).** In the `Products_Tools` → `Time_Tracker` copy, the `Ship_Ahead` flag isn't carried over. Only add it if `Time_Tracker` gets a matching field. Otherwise skip, since the meeting notice covers the tech.
5. **Refactor (recommended, do last).** The 2 scripts duplicate about 90% of their logic. Move the deal-building and rollover into one standalone function `rw_create_deal_from_recurring(String rwId)` that returns the Deal id. Both scripts call it. Keep connection `zoho_pipeline_scope`. Test both triggers after.

## 6. Rules for implementation
1. Verify every API name with the Fields API before use. Do not assume.
2. Every function is **idempotent**. Re-running must not create duplicate POs, tasks, or notice blocks. Check `Books_PO_Number` / existing open tasks first.
3. Wrap every external call and log failures with `info`. On any failure, post a short message to CLIQ_CHANNEL with the record link.
4. Keep each function under 200 lines. Put shared helpers in standalone functions.
5. Put one `.dg` file per function in `/deluge/recurring-work-prep/`, with a header comment giving the trigger, criteria, and arguments.
6. Also produce `SETUP.md` with the exact workflow rules to create by hand in CRM/Books: module, trigger, criteria, and the function and arguments to call.

## 7. Test plan
Use a **test Recurring_Work record** on a test Account, not TE, with 1 Ship-Ahead row pointing to a test Product whose SKU exists in Books.

1. Run `rw_prep_materials` manually and check: 1 draft PO, `RW-` reference, status PO Pending, and the Approve task. Run it again and confirm no duplicates.
2. Issue the PO in Books → status Ordered.
3. Enter a tracking number → status Shipped, email received at a test contact, and a Cliq message.
4. Create a meeting → notice block present and Confirm task due V − 7.
5. Complete the task → Received on Site, with the notice updated on the meeting.
6. Close the Deal → status reset, Leftover kept.
7. Remove Ship_Ahead from the row → every function exits cleanly.

## 8. Known data issue
TE Connectivity's May Recurring_Work record has Kickoff **2027-05-15** with Month = **May**. By the kickoff rule it should be **2027-04-15**. Confirm with Brad. Don't auto-fix.
