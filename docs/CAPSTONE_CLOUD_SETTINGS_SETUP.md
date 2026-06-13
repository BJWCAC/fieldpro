# CapStone Cloud Settings Sync — Phase 1

Sync **Anthropic API key** and **Plaud connection** across devices using the **Zoho technician name** already selected in CapStone. No separate CapStone login.

**Version:** v210+

---

## What syncs

| Setting | Stored |
|---------|--------|
| Anthropic API key | Yes |
| Plaud refresh/access token + email | Yes |
| Auto-save to Zoho toggle | Yes (manual Pull overwrites) |
| Phone photo backup toggle | Yes (manual Pull overwrites) |
| Plaud auto-pull toggle | Yes (manual Pull overwrites) |

**Not synced in Phase 1:** History, deals cache, capture drafts, inbox items.

---

## One-time Netlify setup (admin)

1. Open Netlify → site **dulcet-sherbet-40f8f6** → **Environment variables**
2. Add:

   | Key | Value |
   |-----|-------|
   | `CAPSTONE_SETTINGS_PIN` | A team PIN only your techs know (e.g. 6–12 chars) |

3. **Redeploy** the site (Deploys → Trigger deploy)

Storage uses **Netlify Blobs** (`capstone-cloud` store). `npm install` runs on deploy via `package.json`.

---

## Per-device setup (each technician)

1. Open CapStone **v210**
2. Select **technician** (same name as Zoho Internal_Assets.Users)
3. **Settings → Cloud Settings Sync**
4. Enter **Org PIN** → **Save PIN**
5. On the phone that already has keys configured:
   - Tap **Push to Cloud**
6. On a new phone:
   - Select same technician name
   - Tap **Pull from Cloud** (or leave **Auto-sync** on — fills missing key/token on startup)

---

## Auto-sync behavior

When **Auto-sync when technician changes** is ON (default):

- **Pull** (fill only) when you select your technician or open CapStone — restores missing API key / Plaud token
- **Push** after you save API key or verify Plaud connection

Manual **Pull from Cloud** overwrites local settings with cloud copy.

---

## Security notes

- Org PIN is required for every cloud read/write
- PIN is stored on the device in localStorage (same as API key today)
- Do not share the PIN in email or chat
- Cloud blob keys use normalized technician names — only people with the PIN can read/write

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Invalid org PIN | Check `CAPSTONE_SETTINGS_PIN` on Netlify matches what you entered |
| Cloud storage unavailable | Redeploy after merge; confirm `npm install` ran on Netlify |
| No cloud settings for technician | Push from a device that already has API key / Plaud configured |
| Wrong technician's settings | Confirm technician name matches Zoho picklist exactly |

---

## Related

- `docs/CAPSTONE_CHANGELOG_AND_ROADMAP.md` — Phase 2+ (History/photos in cloud) deferred
- `docs/PLAUD_STAGE2_SETUP.md` — Plaud token setup
