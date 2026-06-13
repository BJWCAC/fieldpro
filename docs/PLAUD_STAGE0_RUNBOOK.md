# Plaud Stage 0 Runbook — MCP validation (zero CapStone code)

Step-by-step guide to set up Plaud Note Pro, connect **Plaud MCP** in Claude, and prove the summarize → Zoho deal note flow **before** AssemblyAI or auto-pull code.

**You are here:** Inbox Stage 1 (v205) already works with a **manual pasted transcript**. Stage 0 adds pulling that transcript from Plaud cloud via MCP instead of copy-paste.

**Related docs:**

- `docs/PLAUD_INTEGRATION.md` — full Fork A/B design
- `docs/CAPSTONE_FIELD_TEST_LOG.md` — log pass/fail when done
- CapStone test URL: `https://BJWCAC.github.io/fieldpro/FieldPro.html?v=205`

```text
Last updated: 2026-06-08
Stage: 0 — user action in Claude + CapStone Inbox
Next dev step after Stage 0 passes: AssemblyAI (A5)
```

---

## What Stage 0 proves

| Step | Tool | Pass when |
|------|------|-----------|
| Record + sync | Plaud Note Pro + mobile app | Recording appears in Plaud cloud |
| Pull transcript | Plaud MCP in Claude | Claude lists recording and returns transcript |
| Summarize | Claude | Structured field note (visit summary, work, findings, next steps) |
| File to deal | CapStone Inbox **or** Zoho MCP | Deal note visible in Zoho CRM |

Stage 0 does **not** require Netlify, AssemblyAI, or Cursor changes.

---

## Part 1 — Note Pro and Plaud app (15 min)

### Hardware and account

- [ ] Charge Plaud Note Pro; pair with the Plaud mobile app (Android or iOS)
- [ ] Sign in with your Plaud account
- [ ] Confirm **Starter (free) plan** is active — sufficient for Cloud Sync + MCP

### App settings (locked-in for CapStone)

Open Plaud app → **Me** (profile):

- [ ] **Private Cloud Sync** (or **Cloud Sync**) → **ON**  
  MCP cannot read recordings that exist only on the device.
- [ ] If the app offers **auto-transcribe** or **AI transcription** on-device: **OFF** for production (CapStone will use AssemblyAI in Stage 1).  
  For Stage 0 validation only, Plaud MCP may still return a transcript if Plaud generated one — that is OK to prove the pull works.

### First test recording

- [ ] Record 1–3 minutes of realistic field content, e.g.:
  - “Called customer about the Rosemont chiller — discussed high discharge pressure, agreed to return Tuesday with gauges…”
- [ ] Wait for sync (Wi‑Fi; usually under a minute)
- [ ] In the Plaud app, confirm the recording shows as **synced to cloud** (not device-only)

---

## Part 2 — Connect Plaud MCP in Claude (10 min)

Official docs: [Plaud MCP](https://docs.plaud.ai/documentation/plaud_app/mcp) · [Plaud support article](https://support.plaud.ai/hc/en-us/articles/57751078986265-Plaud-MCP)

### Option A — Claude Web (recommended if you use claude.ai)

Requires a paid Claude plan (Pro, Max, Team, or Enterprise) for custom connectors.

1. Go to [claude.ai](https://claude.ai) → profile avatar → **Settings** → **Connectors**
2. **Add custom connector**
   - **Name:** `Plaud`
   - **Remote MCP server URL:** `https://mcp.plaud.ai/mcp`
3. Click **Add**, then **Connect** / **Authorize**
4. Sign in to Plaud in the browser popup → **Authorize**
5. Start a **new chat** and confirm Plaud tools appear (hammer/tools icon)

**Alternative:** If **Plaud** is listed in Claude’s Connector Directory, one-click connect there instead of manual URL.

### Option B — Claude Desktop (Mac/Windows)

1. Install [Claude Desktop](https://claude.ai/download) if needed
2. In terminal (Node.js 20+):

   ```bash
   npx -y @plaud-ai/mcp@latest install
   ```

3. Complete browser authorization when prompted
4. Fully quit Claude Desktop (⌘Q / exit tray) and reopen

### Option C — Cursor (optional — for developers)

Same install command; reload Cursor after install. Useful later for Stage 1 code, not required for Stage 0 validation.

### Verify connection

In a new Claude chat, send:

```text
Log me into Plaud if needed, then list my 5 most recent recordings with date and duration.
```

**Pass:** Claude returns at least your test recording from Part 1.

**Fail:** See [Troubleshooting](#troubleshooting) below.

---

## Part 3 — Pull transcript and summarize (10 min)

Pick one real or test Zoho deal name you will use in Part 4 (e.g. account + deal from CapStone Deals tab).

### Prompt 1 — get transcript

```text
Using Plaud MCP, find my most recent recording from today.
Return the full transcript with speaker labels if available.
Do not summarize yet — transcript only.
```

**Pass:** Full transcript text you can read and edit.

### Prompt 2 — field-service summary (CapStone tone)

```text
Turn this transcript into a concise structured field-service note for a Zoho CRM deal.
Use professional language. Include only what was actually said:
- Visit / call summary
- Work discussed or performed
- Findings and observations
- Issues or deficiencies (if any)
- Recommendations and next steps
- Follow-up required (if any)
Do not invent facts. Format as plain text suitable for a CRM deal note.
```

**Pass:** Structured note you would accept on a real deal.

Save the summary somewhere (clipboard or Claude chat) — you will use it in Part 4.

---

## Part 4 — File to Zoho (choose one path)

### Path A — CapStone Inbox (recommended; already field-tested)

This matches production Stage 1 and avoids Zoho MCP session issues.

1. Open CapStone: `https://BJWCAC.github.io/fieldpro/FieldPro.html?v=205`
2. **Deals** → Refresh from Zoho (if needed)
3. **Inbox** → **PICK DEAL** → select the target deal
4. **Add Manual Note**
   - Title: e.g. `Plaud call — [customer/account]`
   - Paste the **transcript** from Prompt 1 (or paste summary only if you skipped transcript)
5. If you pasted transcript only → **Generate Summary** (uses your CapStone API key)
6. **Save to Zoho**
7. Confirm **Saved to Zoho** chip and green banner

**Pass:** Deal note visible in Zoho CRM on the correct deal.

### Path B — Zoho MCP in Claude (optional full Stage 0)

Only if you already have Zoho MCP connected in the same Claude session.

```text
Using Zoho MCP, add a deal note to [Account Name — Deal Name / Deal Id].
Title: CapStone Plaud Stage 0 — [today's date]
Body: [paste the structured summary from Prompt 2]
```

**Pass:** Note appears on the deal in Zoho.

**Note:** CapStone itself uses direct Zoho API via Netlify (`zoho-proxy`), not Zoho MCP. Path A is the supported production path.

---

## Part 5 — Sign-off checklist

Copy into `docs/CAPSTONE_FIELD_TEST_LOG.md` section **G** when done.

| Step | Pass | Date | Notes |
|------|------|------|-------|
| Cloud Sync ON; test recording synced | | | |
| Plaud MCP connected in Claude | | | |
| `list_files` / transcript retrieved | | | |
| Field-service summary acceptable | | | |
| Zoho deal note filed (Inbox or MCP) | | | |
| Ready for AssemblyAI (A5) dev | | | |

**Stage 0 complete when:** all rows Pass.

---

## Day-2 habits (until Stage 1 automation)

1. Record on Note Pro (calls, drive time debrief, customer conversations)
2. Claude + Plaud MCP → pull transcript → summarize
3. CapStone Inbox → link deal → Save to Zoho
4. Optional: delete sensitive recordings from Plaud cloud after filed (privacy)

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| “No recordings” in MCP | Turn on **Private Cloud Sync**; wait for Wi‑Fi sync; record again |
| Plaud tools missing in Claude | New chat; reconnect connector; Claude Web needs paid plan for custom MCP |
| 401 / not authenticated | In Claude: `Log me into Plaud` |
| Transcript empty | Recording may still be syncing; wait 2–5 min; try `get_file` / `get_transcript` in prompt |
| CapStone Generate Summary fails | Tap **KEY** in CapStone header; enter Anthropic API key |
| CapStone Save to Zoho fails | Weak signal → **Zoho Pending** + retry in Settings; or refresh Zoho token |
| Browser doesn’t open on install | Copy OAuth URL from terminal manually (Desktop install) |

Official Plaud MCP troubleshooting: [docs.plaud.ai — MCP](https://docs.plaud.ai/documentation/plaud_app/mcp#troubleshooting)

---

## After Stage 0

| Next | Owner |
|------|-------|
| Log results in field test log | You |
| AssemblyAI in `submit-recording` (A5) — upload audio without paste | Dev |
| Plaud auto-pull / webhook (Stage 2) | Dev later |
| Broader CapStone field test (Pending AI, poor signal) | You |

When Stage 0 is signed off, tell the agent: **“Stage 0 done — start AssemblyAI (A5)”**.
