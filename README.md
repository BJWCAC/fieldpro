# CapStone

CapStone is a field documentation app for Calibrations & Controls. It helps technicians document site visits, link the work to Zoho CRM deals, capture GPS and photos, generate an AI-assisted field report, save the report back to Zoho deal notes, and store related files in WorkDrive.

Live app:

```text
https://BJWCAC.github.io/fieldpro/FieldPro.html
```

Current documented build: **v127**

## What CapStone does

- Loads deals from Zoho CRM.
- Lets a technician select an active deal before capturing work.
- Captures GPS coordinates and optional site address.
- Supports video recording, photo capture, photo uploads, and dictated/typed notes.
- Generates a professional AI field service report.
- Saves the report to Zoho deal notes.
- Uploads report files, photos, and video to WorkDrive.
- Keeps local report History so a report can be reopened and continued.

## Basic workflow

1. Open CapStone.
2. Refresh or import deals.
3. Select the Zoho deal for the site visit.
4. Capture GPS location.
5. Record voice notes, type notes, and/or add photos.
6. Optionally fill in any of the nine structured report fields.
7. Generate the AI report.
8. Review the report.
9. Regenerate if needed.
10. Save/update the report in Zoho.

## The nine report fields

The nine structured report fields are optional. They are there when you want to force information into a specific section.

You can leave them blank and let CapStone build the report from:

- voice notes
- typed notes
- photo descriptions
- selected deal information
- GPS/site information

Use the fields when you want to be specific about:

- Site Visit Summary
- Equipment / Systems Serviced
- Work Performed
- Calibration Results & Readings
- Findings & Observations
- Issues / Deficiencies
- Recommendations & Next Steps
- Follow-Up Required
- Materials / Parts Used

Empty fields are ignored.

## Zoho notes behavior

CapStone is designed to avoid duplicate Zoho deal notes for the same report.

- The first save creates a Zoho note.
- CapStone stores the Zoho Note ID in local History.
- Regenerating or continuing the same report updates the existing Zoho note.
- If the local Note ID is missing, CapStone looks for an existing note using a stable `CapStone Report ID` marker.
- If the stored Zoho note was manually deleted, CapStone clears the stale ID and creates a replacement note.

## WorkDrive file behavior

CapStone uploads photos, videos, and PDFs to WorkDrive.

To reduce duplicate files:

- WorkDrive filenames are stable for a given report.
- Regenerating the same report reuses the same filenames.
- WorkDrive upload requests use name override behavior, so matching files should be replaced instead of duplicated.

Existing duplicate files created before this behavior was added may still need to be cleaned up manually.

## History

CapStone saves reports locally in browser storage. History lets you:

- view previous reports
- continue a report
- regenerate a report
- download a PDF
- export/import history

Because History is stored in the browser, clearing browser data can remove local report history.

## Testing after an update

After merging an update, open the app with a version query string to avoid stale cached files:

```text
https://BJWCAC.github.io/fieldpro/FieldPro.html?v=127
```

Replace `127` with the latest build number after future updates.

Recommended smoke test:

1. Open CapStone with the versioned URL.
2. Refresh deals.
3. Select a deal.
4. Capture GPS.
5. Add a short note and one photo.
6. Generate a report.
7. Confirm the report appears.
8. Save to Zoho.
9. Confirm a Zoho deal note exists.
10. Regenerate the same report.
11. Confirm the same Zoho note updates instead of creating a duplicate.
12. Confirm WorkDrive does not create repeated timestamped copies for the same report.

## Troubleshooting

### The app did not update

Open the versioned URL, for example:

```text
https://BJWCAC.github.io/fieldpro/FieldPro.html?v=127
```

### Deals do not load

- Confirm Zoho credentials/proxy are working.
- Try the Refresh from Zoho button again.
- If cached deals are stale, clear cached deals in Settings.

### Save to Zoho fails

- Try Save to Zoho again.
- WorkDrive/PDF upload timeouts should no longer block the Zoho note save.
- If a note was deleted directly in Zoho, CapStone should create a replacement note on the next save.

### WorkDrive has old duplicate files

Stable filenames prevent future repeated timestamped copies for the same report, but older duplicates may need manual cleanup in WorkDrive.

## Training materials

See:

```text
docs/CAPSTONE_TRAINING_VIDEO_SCRIPT.md
```

This file contains a recording-ready training video script, narration, screen actions, and a quick-start checklist.
