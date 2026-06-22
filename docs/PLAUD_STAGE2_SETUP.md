# Plaud Stage 2 — Auto-pull setup

CapStone **v207+** pulls new Plaud cloud recordings into the **Inbox** tab automatically — no MP3 export and no Claude paste.

Requires:

- Plaud Note Pro with **Cloud Sync ON**
- Plaud auto-transcribe **OFF** (CapStone uses AssemblyAI)
- **`ASSEMBLYAI_API_KEY`** on Netlify (same as v206 Upload Audio)
- One-time **Plaud refresh token** on each phone/browser

---

## 1. Install Plaud CLI (one time, on a computer)

```bash
npm install -g @plaud-ai/cli
plaud login
```

Sign in when the browser opens. Tokens save to `~/.plaud/tokens.json`.

---

## 2. Copy the refresh token into CapStone

On the computer where you ran `plaud login`:

```bash
cat ~/.plaud/tokens.json
```

Copy the **`refresh_token`** value (long string). You can paste the **whole** `tokens.json` contents into CapStone — it will extract `refresh_token` automatically.

On the phone (CapStone):

1. Open **Settings → Plaud Cloud Sync**
2. Paste the refresh token
3. Tap **Save Token** → **Verify Connection**
4. Leave **Auto-pull Plaud recordings** ON

The token stays on the device (localStorage). It is sent to the Netlify `plaud-proxy` function only to call Plaud’s API — same pattern as other CapStone cloud proxies.

---

## 3. Use Inbox

1. Record on Note Pro — **Cloud Sync** uploads to Plaud cloud (may take a minute; opening the Plaud app can help on weak signal)
2. CapStone auto-pulls every **~3 minutes on any tab**, and when you **switch back** to the app — you'll get a toast when new recordings arrive
3. Or open **Inbox** → tap **Pull from Plaud** for an immediate check
4. AssemblyAI transcribes automatically (presigned URL — no 5 MB upload limit)
5. Link deal → Generate summary → Save to Zoho

**First pull:** imports recordings from the last **7 days** only. Later pulls only add recordings newer than the last successful pull.

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Verify fails / 401 | Run `plaud login` again on a computer; paste the new `refresh_token` |
| Pull works but no transcript | Confirm `ASSEMBLYAI_API_KEY` on Netlify and redeploy |
| Old recordings missing | First pull is limited to 7 days; use Stage 0 MCP or Upload Audio for older files |
| Token expired | Re-run `plaud login`; paste new refresh token |

---

## Add another employee / another Plaud unit

The Inbox is **per device** — each phone stores its own Plaud token (`fp_plaud_tokens`) and its own Inbox (`fp_inbox`), and pulls only from the Plaud account its token belongs to. To add a second unit:

1. Give the second employee their own **Plaud Note Pro** and their own **Plaud Starter account** (Cloud Sync ON, auto-transcribe OFF).
2. On their phone, open CapStone and pick **their name as Technician** in Settings.
3. Run **steps 1–3 above** with *their* `refresh_token`.

Their device auto-pulls only their recordings. CapStone stamps the device's selected technician onto each Inbox item and the resulting Zoho deal note (`Recorded by: …`), so every note shows which employee the recording came from. See `docs/PLAUD_INTEGRATION.md` → *Multiple Plaud units / multiple employees*.

---

## Security notes

- Do not share your refresh token in chat or email
- **Disconnect Plaud** in Settings before handing the phone to someone else
- Each technician can use their own Plaud account token on their device

---

## Related

- `docs/PLAUD_INTEGRATION.md` — full Fork A design
- `docs/PLAUD_STAGE0_RUNBOOK.md` — manual MCP path (still valid)
- `docs/ASSEMBLYAI_SETUP.md` — Netlify AssemblyAI key
