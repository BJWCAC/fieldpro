# CapStone

CapStone is the Android-first field documentation system for Calibrations & Controls. It helps technicians capture site visit information, generate a professional AI field service report, save or update the report in Zoho deal notes, and store supporting files in WorkDrive.

Live app:

```text
https://BJWCAC.github.io/fieldpro/FieldPro.html
```

Current milestone build: **v157**

## Current milestone: CapStone Android field workflow

Build v157 brings together the current Android field workflow:

- technician selection on each device
- Zoho deal selection
- GPS capture
- photo and video field documentation
- equipment asset save/update workflow
- search-first asset update flow to help avoid duplicate equipment records
- AI report generation
- Zoho deal note update/recovery behavior
- direct report PDF attachment to the Zoho deal
- asset update notes on both Equipment and Deal records
- WorkDrive file replacement behavior
- local History for continuing reports
- white-background report creation and review screens for better readability on mobile
- first code-structure cleanup step, with CSS and JavaScript moved out of the single HTML file

This milestone is intended to make CapStone usable as a practical Android field reporting tool rather than only a prototype.

## Recommended Android setup

Use CapStone from Chrome on Android.

1. Open Chrome on the Android device.
2. Go to:

   ```text
   https://BJWCAC.github.io/fieldpro/FieldPro.html?v=157
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
6. Record video if needed.
7. Add photos.
8. Add photo descriptions.
9. Dictate or type field notes.
10. Optionally fill in any of the nine structured report fields.
11. Generate the AI report.
12. Review the report.
13. Regenerate if details need correction.
14. Save/update the Zoho deal note.
15. Confirm the report PDF is attached to the Zoho deal and WorkDrive links are included.
16. Use History if the report needs to be continued later.

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
- serial/model quick-search buttons help find existing assets faster
- an existing asset can be updated instead of creating a duplicate
- the asset can be linked to the selected Zoho deal
- each asset save creates a new CapStone Asset Update note on the Equipment record
- the same asset update note is also saved to the selected Deal notes
- the Deal note includes the Zoho Equipment ID for traceability

Keeping a new note for each asset update creates a service history when an asset is updated more than once.

## WorkDrive behavior

CapStone uploads report files, photos, and video to WorkDrive.

Current behavior:

- files use stable names for the same report
- regenerated PDFs use the same report filename
- regenerated photos use the same photo filenames
- regenerated video uses the same video filename
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

Important Android note: clearing Chrome site data can remove local CapStone History.

## Testing after updates

After a new build is merged, test with the versioned URL:

```text
https://BJWCAC.github.io/fieldpro/FieldPro.html?v=157
```

Update the version number when a later build is released.

Recommended Android smoke test:

1. Open CapStone from Chrome or the home screen icon.
2. Refresh Zoho deals.
3. Select a test deal.
4. Capture GPS.
5. Add one field note.
6. Add one test photo.
7. Generate an AI report.
8. Save to Zoho.
9. Confirm the Zoho deal note exists.
10. Confirm the report PDF is attached directly to the Zoho deal.
11. Confirm WorkDrive does not create new timestamped duplicates for the same report.
12. Save or update one test asset.
13. Confirm the Equipment record has a CapStone Asset Update note.
14. Confirm the Deal has the same CapStone Asset Update note.
15. Reopen the report from History.
16. Change a note or field.
17. Generate again.
18. Confirm the existing Zoho note updates or a replacement note is created if the old one was deleted.

## Troubleshooting on Android

### The app did not update

Open the latest versioned URL:

```text
https://BJWCAC.github.io/fieldpro/FieldPro.html?v=157
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

- Try Save to Zoho again.
- If the prior note was deleted in Zoho, CapStone should create a replacement note.
- WorkDrive/PDF upload timeouts should not block the Zoho note save.

### WorkDrive has duplicates

Future reports should use stable filenames. Older duplicate files may need to be removed manually from WorkDrive.

## Training materials

Android training script:

```text
docs/CAPSTONE_ANDROID_TRAINING_VIDEO_SCRIPT.md
```

This script includes narration, screen actions, a short version, and a recording checklist for creating an Android training video.
