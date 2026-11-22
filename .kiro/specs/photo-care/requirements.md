# Kiro - Requirements: photo-care (Photo Treat + Life XP)

Status: APPROVED by owner 17 Nov 2026 to build now; recognition (Amazon Rekognition)
connects afterwards. Supersedes the 16 Nov draft.

## Overview
A **Photo Treat** button opens the phone camera. Photograph something very Scottish
and the Haggling gets a full refill (Hunger, Mood, Energy to 100, Mess to 0) and a
big XP boost, once a day. Until recognition is connected, any photo counts
("placeholder mode") so the flow can be tested and filmed.

**Life XP** is overall experience, like Dungeons & Dragons: it grows slowly as the
Haggling ages and with each bit of care, and jumps with treats. It never goes
down. Health XP stays the separate "how well is it" meter.

## Requirements (EARS)

### R1 Photo Treat button
1. WHILE on the home device, THE SYSTEM SHALL show a "Photo Treat" button with the care actions.
2. WHEN pressed, THE SYSTEM SHALL open the rear camera (`capture="environment"`), or a file picker where there is no camera.
3. THE SYSTEM SHALL shrink the photo on the device (long side <= 1600 px, JPEG; *updated 22 Nov 2026: was 1280 px, raised so can lettering stays readable*) before upload.

### R2 Reward (server decides)
1. WHEN a treat is accepted, THE SYSTEM SHALL set Hunger, Mood, Energy to 100 and Mess to 0, add 20 Health XP (max 100) and 50 Life XP.
2. THE SYSTEM SHALL accept at most one Photo Treat per Haggling per day (carer's timezone).
3. THE reward SHALL be applied on the server and returned to the device; the device SHALL NOT decide it.
4. WHEN refused (already had today's treat, not recognised, too big), THE SYSTEM SHALL say why in the Haggling's voice and change nothing.

### R3 Recognition
1. WHERE AWS recognition is configured, THE SYSTEM SHALL accept the photo only if it shows a treat on the list (R4) above the confidence threshold (proposal: 80% objects, 90% text).
2. WHERE it is not configured, THE SYSTEM SHALL accept any valid image and call it "a mystery treat" (placeholder mode), and the result card SHALL say recognition is not switched on yet.
3. Photos SHALL NOT be stored, by us or by the recognition service.

### R4 Treat list (owner, to finalise when AWS is connected; 3-5 to keep)
Irn-Bru (can text), heather, bagpipes, kilt, unicorn (Scotland's national animal: toys, flags, carvings), whisky, shortbread.
Open point: whisky with a baby creature. Proposal: the Haggling sniffs it and wrinkles its nose ("That's for the carer"), still a treat.

### R5 Life XP
1. THE SYSTEM SHALL add Life XP with age: 10 per day alive, accrued as time passes.
2. THE SYSTEM SHALL add 1 Life XP per care action, at most 30 per day from care.
3. Photo Treat adds 50 (R2.1).
4. Life XP SHALL never decrease.
5. Level SHALL follow D&D-style thresholds: level 2 at 100, 3 at 300, 4 at 600, 5 at 1000, then +500 per level.
6. THE care screen SHALL show "Level N" and Life XP with progress to the next level.

### R6 Memory
WHEN a treat is accepted, THE SYSTEM SHALL write one scrapbook line naming the treat.

## Security considerations
Server checks the user token, ownership, the daily limit and the file type (by signature) and size (max 1.5 MB after resize). AWS keys only in Supabase secrets, IAM user limited to two Rekognition actions. No photo stored. Rate: one treat per day per Haggling, plus 10 checks per carer per day once recognition is on (cost cap).
