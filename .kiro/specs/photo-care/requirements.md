# Kiro - Requirements: photo-care

Status: DRAFT for owner approval (16 Nov 2026). Open decisions are marked **DECIDE**.

## Overview
The carer photographs real Scottish things (a can of Irn-Bru, tartan, sheep...).
The app recognises what is in the photo, says what it saw in the Haggling's voice,
and gives a small reward. Recognition runs on the server through Amazon
Rekognition. Photos are not kept.

## Requirements (EARS)

### R1 Taking a photo
1. WHILE a Haggling lives on a surface (phone or nest), THE SYSTEM SHALL offer a "Show {name} something" button.
2. WHEN pressed, THE SYSTEM SHALL open the camera (or file picker on desktop), and SHALL NOT upload anything until the carer confirms the photo.
3. THE SYSTEM SHALL shrink the photo on the device to at most 1280 px on the long side and under 1 MB before upload.
4. IF the carer is not signed in, THEN THE SYSTEM SHALL ask them to sign in first.

### R2 Recognition
1. WHEN a photo is sent, THE SYSTEM SHALL check it on the server with Amazon Rekognition: read text (for brand names on cans and packets) and find objects (for tartan, sheep and so on).
2. THE SYSTEM SHALL match results against a fixed **care item list** (R3), never against free-form labels.
3. A match SHALL count only at or above a confidence threshold. **DECIDE:** threshold. Proposal: 80% for objects; for text, the words must be read at 90% or more.
4. IF nothing matches, THEN THE SYSTEM SHALL say so kindly ("{name} squints. Not sure what that is.") and give nothing.
5. IF the recognition service fails, THEN THE SYSTEM SHALL say "try again later", give nothing, and care SHALL still work.

### R3 Care item list
**DECIDE:** which items count. Proposal for the hackathon (all fit `scottish-folklore.md`):

| Item | Detected by | Reward (proposal) | Line (example) |
| --- | --- | --- | --- |
| Irn-Bru | text "IRN BRU" / "IRN-BRU" | Health XP +5, mood +10 | "{name} spotted the orange can and did a wee jig." |
| Tartan | object (plaid/tartan pattern) | mood +8 | "{name} nuzzled the tartan. Pure clan pride." |
| Sheep or lamb | object | mood +8, energy +4 | "{name} baa'd back. Badly." |
| Neeps and tatties | object (turnip/potato) | hunger +15 | "Neeps! {name} is practically Burns Night." |
| Fish and chips | object | hunger +15, mood +5 | "{name} stole a chip. Unrepentant." |
| Rain | object/scene (rain, umbrella, wet street) | mood +6 | "Rain! {name} pressed their nose to the glass." |
| Hills / mountains | object/scene | energy +6 | "{name} wants to climb that. Today." |
| Thistle | object (flower; thistle if detected) | mood +5 | "A thistle. {name} gave it a respectful nod." |

Rewards SHALL be clamped by the care engine like any other care action.

### R4 Fair play
1. Each care item SHALL reward at most once per Haggling per day (UK day, carer's timezone).
2. THE SYSTEM SHALL limit photo checks to 10 per carer per day (cost cap) and say so when reached.
3. THE reward SHALL be decided and written by the server, not by the browser.
4. A photo that matches several items SHALL reward the single best match only.

### R5 Memory
1. WHEN an item rewards, THE SYSTEM SHALL write one scrapbook line naming the item (no photo stored).
2. THE SYSTEM SHALL show "{name} saw: Irn-Bru (94%)" so the carer knows what was recognised.

### R6 Privacy
1. THE SYSTEM SHALL NOT store photos, on our side or at AWS (Rekognition image analysis does not keep the image when called with image bytes; confirm in T1).
2. THE SYSTEM SHALL tell the carer, before the first photo, that the photo is checked by Amazon and then discarded.
3. IF Rekognition finds a face, THEN THE SYSTEM SHALL ignore everything else in that photo and say "{name} only looks at things, not people. Try again without anyone in shot."

## Security considerations
- AWS credentials live only in Supabase Edge Function secrets. They belong to an IAM user (or role) allowed **only** `rekognition:DetectText` and `rekognition:DetectLabels`.
- Upload size capped (1 MB after resize; server rejects over 1.5 MB). Only JPEG/PNG/WebP accepted, checked by file signature, not the name.
- Rate limit per carer (R4.2) protects the AWS bill. An AWS budget alarm is set at a low amount (T1).
- The browser never sees AWS keys and never decides rewards.
- New third party (Amazon) named in the CSP is not needed: the browser only talks to Supabase.

## Non-goals
Training a custom model (Rekognition Custom Labels bills hourly while running), storing a photo album, recognising people, scanning barcodes, any purchase or brand partnership.
