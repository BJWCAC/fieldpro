# CapStone Android Training Video Script

This document is a recording-ready script for a CapStone Android training video. It is written for a technician using CapStone on an Android phone in Chrome or from an Android home screen shortcut.

Recommended video length: 12 to 18 minutes.

## Purpose of the video

The video should teach a technician how to use CapStone in the field from start to finish:

- open CapStone on Android
- select the technician using the device
- refresh and select a Zoho deal
- capture GPS
- save or update equipment assets when needed
- add notes, photos, and optional report fields
- generate an AI report
- save/update Zoho deal notes and attach the report PDF to the deal
- understand WorkDrive uploads
- continue a report from History

## Opening message

Screen action:

- Show the Android home screen.
- Tap the CapStone icon, or open Chrome and navigate to the latest CapStone URL.

Narration:

> This video shows how to use CapStone on an Android phone. CapStone is the field documentation system for Calibrations & Controls. It connects a site visit to a Zoho deal, captures field information, generates an AI report, saves the report to Zoho deal notes, and uploads supporting files to WorkDrive.

## Section 1: Open CapStone on Android

Screen action:

- Open Chrome.
- Enter the versioned URL:

```text
https://BJWCAC.github.io/fieldpro/FieldPro.html?v=161
```

- Optionally show Add to Home screen.

Narration:

> Open CapStone in Chrome. After updates, use the versioned link to make sure Android loads the newest build. You can also add CapStone to the Android home screen for quicker access.

On-screen callout:

```text
Use latest versioned URL after updates.
```

If this is the first time CapStone has been opened on the device, select the technician name when prompted.

## Section 2: Refresh Zoho deals

Screen action:

- Go to the Deals tab.
- Tap Refresh from Zoho.
- Wait for deal list to load.

Narration:

> Start by refreshing deals from Zoho. The deal you choose controls where the report note is saved and how the WorkDrive files are organized.

Show:

- search box
- account filter
- stage filter
- deal cards

## Section 3: Select the active deal

Screen action:

- Tap a test deal.
- Show the Capture tab opening.
- Show the active deal panel and header.

Narration:

> Select the correct deal before documenting the visit. CapStone shows the active deal and uses it for the Zoho note and WorkDrive folder.

On-screen callout:

```text
Always confirm the active deal before generating a report.
```

## Section 3A: Asset updates when equipment is added or changed

Screen action:

- Go to the Assets tab.
- Confirm the account/deal context.
- Choose Add New Asset or Update Existing Asset.
- Search for the asset by serial, model, CAC ID, name, building, or designator.
- Load the existing asset if a match is found.
- Complete required fields.
- Tap Save Asset to Zoho.
- Show the saved asset confirmation.
- Show Saved This Visit and tap Reopen if the asset needs another update.

Narration:

> Use the Assets tab when equipment is added, replaced, or updated during the visit. Choose Add New Asset for new equipment, or Update Existing Asset when the equipment is already in Zoho. Search first so an existing asset can be updated instead of creating a duplicate. CapStone saves the Equipment record, links it to the selected Deal, and writes a CapStone Asset Update note to both the Equipment record and the Deal. Saved This Visit lets you reopen an asset for review or another update without searching again. Each asset update creates a new note so the asset has a clear service history.

On-screen callout:

```text
Search first. Then verify notes on both the Equipment record and the Deal.
```

## Section 4: Capture GPS

Screen action:

- Tap Get Location.
- Allow Android/Chrome location permission if prompted.
- Show GPS coordinates.

Narration:

> Tap Get Location to capture the site GPS. If Android asks for permission, allow location access. CapStone includes the GPS and address information in the report and Zoho note.

Troubleshooting note:

> If GPS does not work, check Chrome location permission in Android settings.

## Section 5: Record or enter field notes

Screen action:

- Tap the notes area.
- Dictate or type a short field note.

Sample narration to dictate:

```text
Performed field service visit at the lift station. Verified control panel operation, checked pump lead-lag sequence, inspected float wiring, and tested alarm light operation. Corrosion was found on one terminal strip. Recommend replacement during the next scheduled service visit.
```

Narration:

> The notes are one of the most important inputs. Describe what you did, what you found, and what you recommend. CapStone will use these facts to generate the field report.

Tip:

```text
Use clear facts. Do not rely on the AI to guess missing details.
```

## Section 6: Add photos

Screen action:

- Add one or two photos.
- Add a description under each photo.

Example descriptions:

- Control panel overview after inspection.
- Corrosion observed on terminal strip.
- Pump controller status screen showing normal operation.

Narration:

> Add photos from the camera or gallery. Add a short description to explain why each photo matters. These descriptions help CapStone understand the field evidence.

## Section 7: Explain the nine optional fields

Screen action:

- Scroll to the nine report fields.
- Fill in one example field.

Narration:

> These nine fields are optional. You do not need to fill all of them in. If they are blank, CapStone uses your notes, photos, deal information, and GPS. Use the fields when you want specific information to appear in a specific report section.

Example:

```text
Issues / Deficiencies:
Corrosion noted on one terminal strip.

Recommendations & Next Steps:
Replace terminal strip during next scheduled service.
```

On-screen callout:

```text
Blank fields are ignored.
```

## Section 8: Generate the AI report

Screen action:

- Tap Generate AI Report.
- Wait for the report.
- Show the Report tab.

Narration:

> Tap Generate AI Report. CapStone creates a professional report from the deal, GPS, notes, photos, and any optional fields.

Important:

> Review the report before using it. The technician is responsible for confirming accuracy.

## Section 9: Review the report

Screen action:

- Scroll through Report Header.
- Show Site Photos.
- Show report body.

Narration:

> Review the account, deal, GPS, photos, and report text. Confirm the findings and recommendations are correct.

Review checklist:

- correct account
- correct deal
- correct GPS/site
- correct work performed
- correct findings
- correct recommendations

## Section 10: Save or update the Zoho note

Screen action:

- Tap Save to Zoho if needed.
- Show status messages.
- Optionally open the Zoho deal notes on another screen after recording.

Narration:

> Saving to Zoho creates or updates the deal note. CapStone is designed to avoid duplicate notes for the same report. The first save creates the note. Later saves update that note. CapStone also attaches the report PDF directly to the Zoho Deal and uploads report files to WorkDrive.

Explain:

> If the note was deleted directly in Zoho, CapStone clears the old note ID and creates a replacement note.

On-screen callout:

```text
Same report = update existing Zoho note.
Deleted note = create replacement note.
```

## Section 11: WorkDrive files and Deal PDF attachment

Screen action:

- Show upload status if available.
- Explain that files go to WorkDrive.

Narration:

> CapStone uploads report files, photos, and video to WorkDrive. For the same report, filenames are stable. This helps replace prior files instead of creating repeated timestamped duplicates. The report PDF is also attached directly to the selected Zoho Deal so it can be found from the Deal record.

Important:

> Old duplicates from before this behavior may still need to be cleaned up manually.

## Section 12: PDF Options

Screen action:

- Show PDF Options.
- Toggle Include photos in PDF.
- Tap Download PDF.

Narration:

> Use PDF Options to choose whether photos are included in the PDF. Tap Download PDF to save a copy to the Android device.

## Section 13: Continue a report from History

Screen action:

- Go to History.
- Tap Open + Continue on a report.
- Edit a note or field.
- Generate again.

Narration:

> CapStone History lets you reopen a report and continue working. When you regenerate and save the same report, CapStone attempts to update the existing Zoho note and replace the matching WorkDrive files.

Warning:

> History is stored in Android browser storage. Clearing Chrome site data can remove CapStone History.

## Section 14: Android troubleshooting

Screen action:

- Show Settings.
- Show troubleshooting buttons if appropriate.

Narration:

> If something does not work, first confirm Android permissions. Camera, location, microphone, and file picker access are controlled by Android and Chrome. If the app did not update, use the latest versioned URL.

Troubleshooting points:

- App not updated: open latest `?v=` URL.
- GPS not working: allow Chrome location permission.
- Camera not working: allow Chrome camera permission.
- Deals stale: refresh from Zoho or clear cached deals.
- Zoho note missing: save again; CapStone should create a replacement.
- WorkDrive duplicates: old duplicates may need manual cleanup.
- Asset update missing on Deal: verify the correct active Deal was selected before saving the asset.

## Closing

Screen action:

- Return to the CapStone report screen or home screen icon.

Narration:

> That is the Android workflow for CapStone: select the deal, capture GPS, document the work, generate the AI report, review it, and save it back to Zoho and WorkDrive.

## Short training video version

Use this for a 3 to 5 minute quick-start video.

Narration:

> CapStone is the Android field documentation system for Calibrations & Controls. Open CapStone in Chrome or from the Android home screen. Select the technician, refresh Zoho deals, and select the correct deal. Use Assets when equipment is added or updated. Capture GPS, add notes, add photos, and fill in optional report fields only when needed. Tap Generate AI Report, review the report, and save it to Zoho. CapStone updates the existing Zoho note for the same report, attaches the report PDF to the Deal, creates asset update notes on both the Equipment and Deal, and uses stable WorkDrive filenames to reduce duplicate files. Use History to continue a report later.

## Recording checklist

Before recording:

- Use an Android phone.
- Use a test Zoho deal.
- Use the latest versioned URL.
- Confirm a technician is selected.
- Confirm Android permissions are enabled.
- Prepare one sample field note.
- Prepare one or two sample photos.
- Prepare one sample asset update if demonstrating the Assets tab.
- Avoid showing private customer information.

During recording:

- Move slowly.
- Pause after tapping buttons.
- Narrate what the technician should verify.
- Show the report review step.
- Emphasize that the technician must confirm report accuracy.

After recording:

- Confirm the Zoho test note was created or updated.
- Confirm the report PDF was attached to the Zoho Deal.
- Confirm asset update notes were created on both the Equipment record and the Deal if the Assets tab was demonstrated.
- Confirm WorkDrive files uploaded.
- Clean up test notes/files if needed.
