# CapStone Backend Architecture

Roadmap for moving CapStone from **device-only localStorage** to **login + multi-user + cloud sync**, while keeping the current Android field workflow reliable offline.

```text
Phase 1 (v200): Cloud API + login + History metadata sync — STARTED
Phase 2: Photo blob storage + conflict UI + admin users
Phase 3: Asset drafts + pending sync in cloud queue
Phase 4: Native shell (TWA/Capacitor) — only if PWA limits block field use
```

---

## Principles

1. **Local History remains primary** — poor cell service must never block field work.
2. **Cloud is backup + cross-device** — not a replacement for local save.
3. **Zoho proxy stays separate** — `zoho-proxy.js` for CRM; `capstone-api.js` for CapStone accounts and captures.
4. **Small phases** — each phase ships, field-tests, then continues.

---

## Current stack

| Layer | Technology |
|-------|------------|
| Client | Static `FieldPro.html` + `src/app.js` on GitHub Pages |
| Zoho/WorkDrive | Netlify `zoho-proxy.js` |
| Cloud API (new) | Netlify `capstone-api.js` |
| Cloud storage (Phase 1) | Netlify Blobs store `capstone-cloud` |

---

## Phase 1 — v200 (this PR)

### API (`/.netlify/functions/capstone-api`)

| Action | Purpose |
|--------|---------|
| `health` | Service + storage status |
| `register` | Create account (requires `CAPSTONE_INVITE_CODE` env) |
| `login` | Email + password → session token |
| `logout` | End session |
| `session` | Validate token |
| `sync_push` | Upload local History capture records |
| `sync_pull` | Download captures updated since timestamp |

### Client (`src/capstone-cloud.js`)

- Settings → **Cloud Account (Beta)**
- Sign in / register / sign out
- **Auto cloud backup** toggle (metadata first; photos optional later)
- Push after local History save; pull on app open

### Data model (blob keys)

```text
email:{email}           → { user_id }
user:{userId}           → { id, email, display_name, password_hash, role, created_at }
session:{token}         → { user_id, expires_at }
capture:{userId}:{id}   → History record JSON
```

### Netlify setup (required for cloud features)

1. Deploy site on Netlify (same site as `zoho-proxy`).
2. Set environment variable:

   ```text
   CAPSTONE_INVITE_CODE=<your-team-secret>
   ```

3. Run `npm install` before deploy so `@netlify/blobs` is available to functions.

---

## Phase 2 — planned

- Object storage for photo binaries (S3 / Supabase Storage / WorkDrive mirror)
- `include_photos` sync path with size limits
- Admin role: list users, disable accounts
- Merge conflicts UI when two devices edit same capture

---

## Phase 3 — planned

- Cloud queue for pending Zoho/WorkDrive retries
- Asset draft sync
- Org-wide technician roster from server (not hardcoded dropdown)

---

## Phase 4 — native app (optional)

- PWA Add to Home screen remains default
- TWA or Capacitor only if needed for:
  - background sync
  - richer file access
  - MDM deployment

---

## Security notes

- Passwords hashed with `scrypt` (see `capstone-crypto.js`)
- Session tokens are random 32-byte hex; 30-day expiry
- Registration gated by invite code until admin UI exists
- **Do not** store Anthropic or Zoho secrets in cloud API

---

## Related docs

- `docs/CAPSTONE_CHANGELOG_AND_ROADMAP.md` — status
- `docs/CAPSTONE_DEVELOPMENT_RULES.md` — PR and testing rules
