# CapStone Key Sync (Cloud) — Phase 1

Key Sync lets a technician back up their CapStone **keys and app settings** to the
cloud and restore them on another device, without re-entering anything by hand.

It is keyed by the **Zoho technician name** and protected by a **passphrase** the
technician chooses. This is Phase 1 of cloud sync: it syncs keys/settings only,
not reports, drafts, photos, or History.

## What gets synced

The whitelist of `localStorage` keys backed up / restored:

| Key | What it is |
|-----|------------|
| `fp_api_key` | Anthropic API key |
| `fp_plaud_tokens` | Plaud connection tokens |
| `fp_plaud_auto_pull` | Plaud auto-pull on/off |
| `fp_auto_save_zoho` | Auto-save to Zoho toggle |
| `fp_auto_save_phone_photos` | Auto-save photos to phone toggle |
| `fp_record_audio` | Record audio in video toggle |
| `fp_theme` | Light / dark theme |
| `fp_key_sync_auto` | Auto-backup toggle (on unless turned off) |
| `fp_key_sync_auto_restore` | Auto-restore on app open toggle (on unless turned off) |

Reports, capture drafts, photos, deal cache, and History are **not** synced — they
stay on the device.

**Not synced (device-only):** `fp_sync_pass` — the passphrase stays on each phone
for security. You must enter/save the same passphrase on every device before Restore
works.

## How a technician uses it

1. Select your technician name (header or Settings).
2. Go to **Settings → Key Sync (Cloud)**.
3. Type a **sync passphrase** (4+ characters) and tap **Save passphrase on this device**.
   Keep this passphrase private — it protects your keys in the cloud.
4. Turn on **Auto-backup keys to cloud** (default on). After you change your API key,
   Plaud connection, or app toggles, CapStone uploads to the cloud within ~8 seconds.
5. Turn on **Auto-restore on app open** (default on). On a new device, CapStone pulls
   **missing** keys and settings from the cloud when it opens or when you select your
   technician — it does not overwrite values already saved on that device.
6. You can still tap **Back up keys to cloud** or **Restore keys to this device**
   anytime. Manual restore overwrites all synced settings (with confirmation).

If no backup exists for the technician, Restore reports "No cloud backup found".
If the passphrase is wrong, Restore reports "Wrong passphrase".

## Security model (Phase 1)

- Records are stored server-side keyed by a hash of the normalized technician name.
- Settings are **encrypted at rest** with AES-256-GCM, using a key derived from the
  passphrase via scrypt. The server never stores the passphrase, only the encrypted
  blob. Without the passphrase the blob cannot be decrypted, and a pull with the
  wrong passphrase fails the GCM authentication check (HTTP 403).
- The passphrase is the only secret protecting the cloud copy, so technicians should
  choose a strong passphrase and not share it.

## Backend (Netlify)

- Function: `netlify/functions/key-sync.js`.
- Storage: **Netlify Blobs** (store name `capstone-key-sync`). When Blobs is
  unavailable (e.g. local dev), it falls back to a filesystem store under
  `KEY_SYNC_DIR` or the OS temp dir, so the function can be exercised locally.
- No extra secrets are required. Netlify Blobs is available to deployed functions
  automatically. Because this function uses the Lambda compatibility handler
  (`exports.handler`), it calls `connectLambda(event)` before `getStore()` — that
  is required in Lambda mode or Blobs throws `MissingBlobsEnvironmentError`.

### Actions

`POST` JSON to the function:

| `action` | Body | Returns |
|----------|------|---------|
| `push` | `technician`, `passphrase`, `settings` (object), `device` | `{ ok, updatedAt, fields }` |
| `pull` | `technician`, `passphrase` | `{ ok, found, settings, updatedAt, device }` or `403` on wrong passphrase |
| `status` | `technician` | `{ ok, found, updatedAt, device, fields }` (no secrets) |

## Local testing

The function has no external dependencies for the filesystem fallback, so it can be
driven directly:

```js
process.env.KEY_SYNC_DIR = "/tmp/keysync";
const fn = require("./netlify/functions/key-sync.js");
await fn.handler({ httpMethod: "POST", body: JSON.stringify({ action: "push", technician: "Brad White", passphrase: "secret123", settings: { fp_api_key: "sk-ant-..." } }) });
```

To test the client end-to-end, serve the repo root (`python3 -m http.server`) and set
`localStorage.fp_key_sync_url` to point at a locally running `key-sync` function.

## Not in Phase 1 (future)

- Syncing reports, drafts, photos, or History (see Phase 2+ in the roadmap).
- Per-device sync history / conflict resolution beyond last-write-wins.

## Phase 1.5 — auto-backup (v309)

- **Auto-backup keys to cloud** toggle in Settings (default on).
- Debounced push (~8s) after API key, Plaud tokens, or synced toggle changes.
- Manual **Back up keys to cloud** still available for immediate upload.
- Auto-backup is silent on success (status line only); manual backup still toasts.

## Phase 1.6 — auto-restore (v310)

- **Auto-restore on app open** toggle in Settings (default on).
- On app open or technician select, pulls cloud backup and fills **missing only**
  (no API key locally, no Plaud connection, unset toggles).
- Manual **Restore keys to this device** still overwrites all synced settings.
- Auto-restore runs once per technician per app session unless you change technician
  or save the passphrase again.
