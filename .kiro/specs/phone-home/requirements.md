# Kiro - Requirements: phone-home

Status: APPROVED by owner 17 Nov 2026 (pivot: `docs/PIVOT-2026-11-17-phone-first.md`).
Supersedes the phone hand-off parts of `nest-and-ready` (R4-R5) and `brood-sync` (R3).
Test platform: Android (Chrome). iPhone supported, not the demo target.

## Requirements (EARS)

### R1 One site, two faces
1. THE SYSTEM SHALL serve one web app at haggisgotchi.com.
2. WHEN opened on a desktop-sized screen, THE SYSTEM SHALL show the mother (brood, scrapbook, graveyard) and a QR code linking to haggisgotchi.com for the phone.
3. WHEN opened on a phone, THE SYSTEM SHALL show the phone flow (R2-R3). Screen size and touch are used for layout only, never for security.

### R2 Install first
1. WHEN a phone opens the site in a browser tab, THE SYSTEM SHALL ask the carer to add it to the home screen before claiming.
2. WHERE the browser offers an install prompt (Android Chrome), THE SYSTEM SHALL show an "Add Haggis-gotchi to your home screen" button that triggers it.
3. WHERE it does not (iPhone), THE SYSTEM SHALL show a short picture guide (Share, then Add to Home Screen).
4. THE carer SHALL be able to skip ("Carry on in the browser").
5. THE SYSTEM SHALL provide a web app manifest (name, icons, standalone display, Highlands theme colour).

### R3 One code, once
1. WHEN a signed-out carer starts on the phone, THE SYSTEM SHALL ask for their email and send one 6-digit code.
2. WHEN verified, THE device SHALL stay signed in; the carer SHALL NOT need another code on that device.
3. THE claim form SHALL appear only after sign-in, and the egg SHALL be linked to the signed-in carer at claim.
4. THE SYSTEM SHALL NOT send a separate "egg ready" email to a carer who has reminders on (R2 of `care-reminders` sends a notification instead).

### R4 Home device
1. Each device SHALL have a random device id stored on that device.
2. WHEN a Haggling is named (hatched), THE SYSTEM SHALL record the naming device as its home device, on the server.
3. WHILE a signed-in device is not the home device, THE SYSTEM SHALL show the Haggling read-only ("watching") with a "Move {name} here" button.
4. Care actions SHALL be available only on the home device.
5. This rule keeps one carer at a time. It is a product rule between the owner's own devices, not a security boundary (row-level security already limits every row to its owner).

### R5 Move here
1. WHEN the carer presses "Move {name} here", THE SYSTEM SHALL make this device the home device, on the server.
2. THE previous home device SHALL switch to watching the next time it checks (within 1 minute while open).
3. Moving SHALL never create a second Haggling.

### R6 Desktop window
1. WHEN a carer signs in on a desktop, THE SYSTEM SHALL show their brood with live meters, scrapbook and graveyard, read-only unless that desktop is the home device.

## Security considerations
Unchanged server protections: claim-egg (bot check, validation, rate limits), RLS on every table, owner-only RPCs. New RPC `set_home_device` is owner-only. Device id is not secret and grants nothing.

## Non-goals
Native app stores, account passwords, multiple carers per Haggling.
