# AssemblyAI setup for CapStone Inbox

CapStone Inbox **Upload Audio** uses AssemblyAI when `ASSEMBLYAI_API_KEY` is set on Netlify.

## One-time Netlify setup

1. Sign up at [assemblyai.com](https://www.assemblyai.com) and copy your API key.
2. Open Netlify → site **dulcet-sherbet-40f8f6** → **Site configuration** → **Environment variables**.
3. Add:
   - **Key:** `ASSEMBLYAI_API_KEY`
   - **Value:** your AssemblyAI API key
4. **Deploys** → **Trigger deploy** → **Deploy site** (required for functions to see the new variable).

## Test after deploy

1. Open `https://BJWCAC.github.io/fieldpro/FieldPro.html?v=206`
2. **Inbox** → **Upload Audio** (file under **5 MB**)
3. Card shows **Transcribing** — transcript appears in 1–3 minutes automatically
4. **Generate Summary** → **Save to Zoho**

If the key is missing, upload still works but shows: *set ASSEMBLYAI_API_KEY on Netlify* — use **Add Manual Note** with Plaud transcript instead.

## Functions

| Function | Role |
|----------|------|
| `submit-recording` | Upload audio → start AssemblyAI job |
| `get-transcript` | Poll job status; return transcript with speaker labels |
| `transcript-ready` | AssemblyAI webhook (logging; client polls `get-transcript`) |

## Limits

- **5 MB** max upload (Netlify function payload limit)
- Longer recordings: use Plaud MCP → paste transcript, or trim audio before upload
