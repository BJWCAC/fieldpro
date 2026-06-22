# Recordings repository — Zoho CRM module setup

CapStone **v306+** can file every Inbox recording into a single, searchable Zoho CRM custom module — the **recordings repository** — in addition to (or instead of) a deal note. This gives one place to browse, filter, and search across **all** calls, meetings, and field recordings, while still linking each one back to its Deal and Account.

This is a lighter near-term step toward the deferred **Fork B — Diary/RAG** semantic search in `docs/PLAUD_INTEGRATION.md`. For now it relies on Zoho CRM search + AI-extracted keywords (Topics), which works well for "find the recording that mentioned *magmeter* / *Acme* / a serial number."

---

## 1. Create the module (one time, in Zoho CRM)

Zoho **Setup → Developer Hub / Modules and Fields → Create New Module**.

- **Module name (singular/plural):** `Recording` / `Recordings`
- Confirm the **API name** is `Recordings`. If Zoho generates a different API name, either rename it to `Recordings`, or set the Netlify env var `RECORDINGS_MODULE` to the actual API name (the proxy reads it).

CapStone writes records with the **field API names** below. Create each field with a label that produces the matching API name (Zoho derives the API name from the label; verify under *Fields → … → Edit Properties → API Name* and adjust if needed).

| Field label | Field type | API name (must match) | Notes |
|-------------|-----------|------------------------|-------|
| Name | Single Line (default) | `Name` | Auto-created. CapStone sets `Account — Title`. |
| Recording Date | Date/Time | `Recording_Date` | When the recording was captured. |
| Source | Pick List | `Source` | Values: `plaud`, `upload`, `manual`. |
| Recorded By | Single Line | `Recorded_By` | Technician name (Zoho `Internal_Assets.Users`). Can be upgraded to a Users lookup later. |
| Deal | Lookup → Deals | `Deal` | Shows the recording in the deal's related list. |
| Account | Lookup → Accounts | `Account` | Shows it under the account too. |
| Summary | Multi Line (Large, 32000) | `Summary` | Claude-generated structured note. |
| Transcript | Multi Line (Large, 32000) | `Transcript` | Full transcript (truncated to ~32k; see WorkDrive note). |
| Topics | Single Line (or Multi Line Small) | `Topics` | AI-extracted keywords — **this is what makes CRM search useful**. |
| Plaud File ID | Single Line | `Plaud_File_ID` | Dedupe / trace back to Plaud. |
| Recording Link | URL | `Recording_Link` | Optional WorkDrive link to full text/audio. |
| Status | Pick List | `Status` | Values: `New`, `Linked`, `Synced`. |
| Inbox Item ID | Single Line | `Inbox_Item_ID` | CapStone Inbox id for idempotent updates. |

> **Search caveat:** Zoho CRM does **not** reliably full-text index long multi-line fields. Use the **Topics** field (single line, AI-extracted keywords) as your primary search field, and put the **full transcript in WorkDrive** (which is full-text searchable) when you need to grep the raw words. Searching the `Transcript` field directly will be limited for long calls.

---

## 2. Optional Netlify env var

Only if the module API name is **not** `Recordings`:

```text
RECORDINGS_MODULE = <your module API name>
```

Add it in Netlify → Site settings → Environment variables, then redeploy. No other secrets are needed — the repository write reuses the existing Zoho OAuth token CapStone already passes to `zoho-proxy`.

---

## 3. Deploy the proxy

The repository write uses two new `zoho-proxy` actions: `save_recording` and `update_recording` (proxy build **284+**). Redeploy Netlify so the proxy is current. CapStone shows a proxy-deploy reminder when the build is behind.

---

## 4. Use it from the Inbox

For any Inbox item (Plaud pull, uploaded audio, or manual note):

1. (Optional) **Generate Summary** — also extracts a `Topics:` keyword line.
2. **Save to Repository** — creates/updates one `Recordings` record. Works **with or without** a linked deal, so even unassigned recordings land in the repository.
3. **Save to Zoho** (deal-linked items) — files the deal note **and** upserts the same repository record, so the deal note and the repository stay in sync.

The Inbox card shows an **In Repository** chip once a record exists, and **Update Repository** re-saves changes to the same record. Failed repository writes queue in **Pending Sync** and retry automatically.

Attribution: the device's selected technician (`Recorded By`) is stamped on every record (see v305), so a multi-employee / multi-Plaud setup shows who captured each recording.

---

## Related

- `docs/PLAUD_INTEGRATION.md` — Fork A/B design, Inbox, and the multi-Plaud regimen
- `docs/PLAUD_STAGE2_SETUP.md` — Plaud auto-pull setup
- `docs/CAPSTONE_DEVELOPMENT_RULES.md` — Zoho field/API-name and Pending Sync rules
