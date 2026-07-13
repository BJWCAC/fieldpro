# CapStone

CapStone is the Android-first field documentation system for Calibrations & Controls. It helps technicians capture site visit information, generate a professional AI field service report, save or update the report in Zoho deal notes, and store supporting files in WorkDrive.

Live app:

```text
https://BJWCAC.github.io/fieldpro/FieldPro.html
```

Current milestone build: **v322**

Status and roadmap: `docs/CAPSTONE_CHANGELOG_AND_ROADMAP.md`

## Deployment: Zoho credentials (Netlify environment variables)

As of v322, the Zoho OAuth refresh token, client ID, and client secret are **no longer stored in `src/app.js`**. They live server-side only, read by `netlify/functions/zoho-proxy.js` from Netlify environment variables:

```text
ZOHO_REFRESH_TOKEN
ZOHO_CLIENT_ID
ZOHO_CLIENT_SECRET
```

Set these in the Netlify site dashboard under Site configuration → Environment variables, then trigger a deploy. Because the previous hardcoded values were committed to this public repo, treat them as already exposed — regenerate the Zoho client secret and refresh token in the Zoho API console and use the new values here, rather than reusing the old ones.

## Current milestone: CapStone Android field workflow

Build v308 builds on the Android field workflow with the Inbox voice pipeline, Accounts Map, full asset category layouts, and cloud key sync, on top of the earlier reliability hardening for poor cell service:

- technician selection on each device (loaded from Zoho `Internal_Assets.Users`)
- Zoho deal selection with Deal Selection Workflow card
- GPS capture with View on OpenStreetMap link
- photo and video field documentation with labels, sync status, and phone Downloads backup
- local History save **before** Zoho/network steps
- storage warning when many photos may fill browser storage
- **Inbox tab** — stage unassigned voice recordings, transcribe with AssemblyAI, link to a deal, and save to Zoho
- **Plaud auto-pull** — Plaud cloud recordings pull into the Inbox automatically
- **Accounts Map tab** — Leaflet/OpenStreetMap view of Zoho accounts with deal-stage pins, clustering, and filters
- **Key Sync (Cloud)** — back up and restore your API key and app settings across devices, keyed by Zoho technician name and protected by a passphrase (see `docs/CAPSTONE_KEY_SYNC.md`)
- equipment asset save/update workflow with draft autosave
- **Auto-generated Model_AI_Specs** — new assets get calibration-relevant AI specs written into Zoho on save, before the technician performs the calibration (skipped for junk/placeholder model numbers and never overwrites an existing asset's specs on update)
- **Asset Category layouts** — category-driven fields for Flow Meter, Flow Open Channel, Gas Detector, General, Lift Station, and Scales &amp; Balances
- per-field → AI extract with an offline Pending AI queue
- search-first asset update (CAC ID, serial, model, brand, type, series, name, building, designator)
- separate Add New Asset and Update Existing Asset paths
- Replace Instrument workflow with in-app replacement history cards
- Saved This Visit reopen action for recently saved assets
- collapsible help boxes on all tabs
- in-app Quick Start help from the header
- report and asset save checklists
- organized Settings tab (technician, sync, storage, troubleshooting, appearance, API key, app info)
- Pending Sync badge and retry for failed Zoho/WorkDrive/asset operations
- AI report generation with optional nine structured fields
- Zoho deal note update/recovery behavior
- direct report PDF attachment to the Zoho deal
- asset update notes on both Equipment and Deal records
- richer Deal `Instrument_Description` when assets are linked or updated
- WorkDrive file replacement behavior with stable filenames
- local History for continuing reports
- white-background workflow cards for readability on mobile
- modular shell (`FieldPro.html` + `src/app.js` + `src/styles.css`)

## Recommended Android setup

Use CapStone from Chrome on Android.

1. Open Chrome on the Android device.
2. Go to:

   ```text
   https://BJWCAC.github.io/fieldpro/FieldPro.html?v=308
   ```

3. Tap the Chrome menu.
4. Choose **Add to Home screen**.
5. Name it **CapStone**.
6. Launch CapStone from the new home screen icon.

Using the versioned URL helps avoid stale cached files after an update.

## Android permissions

CapStone may ask Android/Chrome for:

- Camera permission
- Microphone permission, if recording audio is enabled
- Location permission for GPS
- File/photo picker access when uploading photos from the gallery

If permissions are denied, open Android app/site settings for Chrome and allow the needed permissions.

## Daily field workflow

1. Open CapStone on Android.
2. Select the technician if prompted.
3. Refresh deals from Zoho.
4. Select the correct Zoho deal.
5. Capture GPS location.
6. Record video if needed; use Snap Photo for stills.
7. Add photos from gallery or video snaps.
8. Add photo labels and descriptions.
9. Dictate or type field notes.
10. Optionally fill in any of the nine structured report fields.
11. Generate the AI report.
12. Review the report.
13. Regenerate if details need correction.
14. Save Report to Zoho when signal allows.
15. Confirm the report PDF is attached to the Zoho deal and WorkDrive links are included.
16. Use History if the report needs to be continued later.

## Reliability on poor cell service

CapStone is designed so field work is not lost when Zoho or network steps fail:

- Capture work saves to local **History** automatically and before generate/Zoho steps.
- Use **Save Locally** on Capture if you want an immediate History save.
- Capture photos can auto-save to phone **Downloads** (Settings toggle).
- Use **Save to Phone** or **Save All Photos to Phone** anytime as backup.
- An amber **storage warning** appears at 8+ photos or high storage use — export older History from Settings if needed.
- Failed Zoho/WorkDrive steps queue in **Pending Sync** for retry.

## The nine report fields

The nine structured report fields are optional. They are not required to generate a report.

Leave them blank when the voice notes and photo descriptions already explain the work.

Fill in one or more fields when you want to force information into a specific section:

1. Site Visit Summary
2. Equipment / Systems Serviced
3. Work Performed
4. Calibration Results & Readings
5. Findings & Observations
6. Issues / Deficiencies
7. Recommendations & Next Steps
8. Follow-Up Required
9. Materials / Parts Used

Empty fields are ignored.

## Zoho deal notes behavior

CapStone is designed to reduce duplicate Zoho deal notes.

- The first save creates a Zoho note.
- CapStone stores the Zoho Note ID in local History.
- Regenerating the same report updates the existing Zoho note.
- If the local note ID is missing, CapStone looks for an existing report note using a stable `CapStone Report ID` marker.
- If the stored note was deleted manually in Zoho, CapStone clears the stale ID and creates a replacement note.
- If Zoho returns a blank update error for a missing note, CapStone retries by creating a replacement note.
- CapStone also attaches the generated report PDF directly to the selected Zoho deal when saving.

Important: notes created before the report marker was added may not always be recoverable automatically. Once a report is saved with the current milestone behavior, future updates are more reliable.

## Asset update behavior

CapStone can save or update equipment assets from the Assets tab.

Current behavior:

- required asset fields are highlighted before save
- technicians are prompted to search before creating a new asset
- search supports CAC ID, serial, model, brand, type, series, name, building, and designator
- Add New Asset and Update Existing Asset paths keep creation and update workflows clear
- asset draft autosave and restore after Android reload
- Replace Instrument updates the same Equipment record and appends structured replacement history
- serial/model quick-search buttons help find existing assets faster
- Saved This Visit lets technicians reopen a saved asset for review or another update without searching again
- an existing asset can be updated instead of creating a duplicate
- the asset can be linked to the selected Zoho deal with a rich `Instrument_Description`
- re-saving an already-linked asset refreshes the Deal checklist description
- each asset save creates a new CapStone Asset Update note on the Equipment record
- the same asset update note is also saved to the selected Deal notes
- the Deal note includes the Zoho Equipment ID for traceability

Replacement history stays on the Equipment record (`Description_Instructions` + update notes). CapStone does **not** use a separate Zoho replacement subform.

## WorkDrive behavior

CapStone uploads report files, photos, and video to WorkDrive.

Current behavior:

- files use stable names for the same report
- regenerated PDFs use the same report filename
- regenerated photos use the same photo filenames (with labels when set)
- regenerated video uses the same video filename
- capture photos show per-photo sync status with retry
- WorkDrive upload requests use name override behavior

This means future regenerations of the same report should replace matching files instead of creating repeated timestamped duplicates.

Old duplicate files created before this behavior may need to be cleaned up manually in WorkDrive.

## Local History

CapStone stores report History in the Android browser's local storage.

History lets a technician:

- view a previous report
- open and continue a report
- regenerate a report
- save/update the Zoho note again
- download a PDF

Important Android note: clearing Chrome site data can remove local CapStone History. Export History from Settings before clearing storage on a shared device.

## Testing after updates

After a new build is merged, test with the versioned URL:

```text
https://BJWCAC.github.io/fieldpro/FieldPro.html?v=308
```

Update the version number when a later build is released.

Use the full checklist:

```text
docs/CAPSTONE_PROGRAM_REVIEW_CHECKLIST.md
```

Log results in:

```text
docs/CAPSTONE_FIELD_TEST_LOG.md
```

Recommended Android smoke test:

1. Open CapStone from Chrome or the home screen icon.
2. Refresh Zoho deals.
3. Select a test deal.
4. Capture GPS.
5. Add one field note.
6. Add one test photo with a label.
7. Confirm draft/local save status appears.
8. Generate an AI report.
9. Save Report to Zoho (or confirm work remains in History if offline).
10. Confirm the Zoho deal note exists when online.
11. Confirm the report PDF is attached directly to the Zoho deal.
12. Save or update one test asset; search by brand or partial serial, and confirm category-layout fields render for the asset category.
13. Confirm Equipment and Deal asset update notes.
14. Reopen the report from History.
15. Change a note or field.
16. Generate again.
17. Confirm the existing Zoho note updates or a replacement note is created if the old one was deleted.

Stress test (poor signal):

1. Capture 10–15 photos with labels on a weak cell connection.
2. Confirm local History save succeeds before Zoho.
3. Confirm phone Downloads backup works.
4. Confirm storage warning appears at 8+ photos.
5. Confirm Pending Sync queues failed uploads for retry.

## Troubleshooting on Android

### The app did not update

Open the latest versioned URL:

```text
https://BJWCAC.github.io/fieldpro/FieldPro.html?v=308
```

If needed, close Chrome fully and reopen CapStone.

### Camera or GPS does not work

Check Android permissions:

- Chrome camera permission
- Chrome location permission
- Chrome microphone permission, if using audio

### Deals do not load

- Tap Refresh from Zoho again.
- Check connection.
- Clear cached deals from CapStone Settings if the deal list is stale.

### Save to Zoho fails

- Work is still in local History — reopen from History tab.
- Try Save Report to Zoho again when signal improves.
- Check Pending Sync in Settings for queued retries.
- If the prior note was deleted in Zoho, CapStone should create a replacement note.

### Local save or storage issues

- Export older History from Settings.
- Use Save All Photos to Phone as backup.
- Clear photos from reports older than 7 days in Settings if storage is full.

### WorkDrive has duplicates

Future reports should use stable filenames. Older duplicate files may need to be removed manually from WorkDrive.

## Training materials

Android training script (recording on hold — script updated for v308):

```text
docs/CAPSTONE_ANDROID_TRAINING_VIDEO_SCRIPT.md
```

Program status and roadmap:

```text
docs/CAPSTONE_CHANGELOG_AND_ROADMAP.md
```
