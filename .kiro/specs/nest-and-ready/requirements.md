# Kiro - Requirements: nest-and-ready

Status: DRAFT for approval (16 Nov 2026). Documents behaviour built in Cursor and fixes its gaps.

## Overview
The mother (`/`) only keeps the brood. A Haggling lives on its nest at
`haggisgotchi.com/{slug}` and, after hand-off, on the phone. A ready email brings
a carer back to the nest. Hand-off to the phone costs nothing per message.

## Requirements (EARS)

### R1 Mother never hosts care
1. THE mother `/` SHALL NOT render the care screen.
2. WHEN a carer selects a brood row, THE SYSTEM SHALL open `/{slug}` in a new tab with `noopener,noreferrer`.

### R2 Nest URL
1. THE SYSTEM SHALL derive the slug from the display name (lowercase, a-z 0-9 and hyphen, max 40).
2. IF a slug is reserved (`admin`, `api`, `phone`, `privacy`, `terms`, `graveyard`, `static`, `assets`, `art`) THEN THE SYSTEM SHALL append a suffix.
3. IF a slug is already used by a different carer, THEN THE SYSTEM SHALL append a short suffix (`-2k`) at claim time, server-side.
4. WHEN a signed-out visitor opens `/{slug}`, THE SYSTEM SHALL show only the waiting or sign-in state, never another carer's data.

### R3 Ready email
1. WHEN `ready_at` has passed and no email was sent, THE SYSTEM SHALL email the carer a link to `/{slug}` once.
2. WHEN the carer opens the nest, THE SYSTEM SHALL ask them to sign in with a 6-digit email code (Supabase OTP) before cloud actions.
3. Security rules for the email are in `security-hardening` R2-R3.

### R4 Phone hand-off (free paths only)
1. WHEN the carer chooses Send to phone, THE SYSTEM SHALL offer: QR, Copy link, Copy code, Share (Web Share API), Open WhatsApp (`https://wa.me/?text=`), Open Messages (`sms:?&body=`).
2. THE QR and link SHALL carry only the short code (`phone.haggisgotchi.com/#/c/CODE`).
3. THE SYSTEM SHALL generate the QR **in the browser** and SHALL NOT send the link to any third party.
4. THE SYSTEM SHALL NOT call Twilio; the "Text the claim link" button SHALL be hidden unless `VITE_SMS_ENABLED=true`.

### R5 Phone claim
1. THE phone SHALL require sign-in with the same email, then accept the code (see `brood-sync` R3, `security-hardening` R5).

## Non-goals
Paid SMS, WhatsApp Business API, native apps, Pi pairing.

## Security considerations
Slug and display name are attacker-controlled: escape in email, validate in URLs.
Reserved slugs prevent route hijack. Third-party QR service removed.
