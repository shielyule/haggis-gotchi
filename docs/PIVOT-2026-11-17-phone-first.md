# Kiro - Pivot: phone-first Haggling (17 Nov 2026)

For the Kiroween write-up. Why the product changed direction halfway through the
build, what was kept, and what we learned.

## What we had (16 Nov)

The egg was claimed on the desktop "mother" site, hatched there after an email
code, then handed to the phone with a second sign-in and a 6-character claim code
(QR or typed). Two websites: haggisgotchi.com (mother) and phone.haggisgotchi.com.

## Why it failed in testing

The owner's first real test on 16-17 Nov:

| Problem | Cause |
| --- | --- |
| Three codes to get one pet onto a phone | Email code to hatch, email code to sign in on the phone, claim code to move it |
| Two emails per egg | Nest sent a sign-in code at ready time; the cron also sent the ready email |
| "No Haggling for this nest on this device" | The nest only knew eggs stored in that browser; a page-state bug hid the cloud egg after sign-in |
| QR never opened the phone app | The phone domain was serving the mother app (Cloudflare project settings) |
| Same pet cared for on two devices | Old "full packet" link copied the pet with no sign-in (removed 16 Nov) |

Each problem was fixable on its own. Together they showed the flow was too fiddly
for a toy people open several times a day.

## The decision

**The Haggling is born on the phone and lives there.**

1. Desktop home = the mother: brood, scrapbook, graveyard, and a QR "Your Haggling lives on your phone".
2. On the phone: Add to Home Screen first (an app icon; on iPhone the home-screen app has separate storage from Safari, so installing first avoids losing the egg).
3. Open the icon, claim, enter **one** email code. That phone stays signed in.
4. Hatching and care reminders arrive as **phone notifications**.
5. The device that hatched it is its **home**. Other signed-in devices can watch (read-only). "Move here" moves it to a new phone. It never copies.
6. **One website.** haggisgotchi.com on a phone is the app; on a desktop it is the mother. The second phone site is retired.

Testing and the demo video use **Android** (shares storage between Chrome and the installed app; full web-push support).

## What was kept

- Security work: bot check, validation and rate limits on claiming (`claim-egg`), cron secret, row-level security, escaped emails.
- The shared care engine and merge rules (`packages/care-engine`).
- Birth stories, temperaments, hatch films, scrapbook.

## What was retired

- Claim-code hand-off to a second site (`mint_transfer_code`, `claim_child_by_code` stay in the database unused, documented, not exposed in the UI).
- `apps/phone` as a separate deployed site.
- Paid SMS hand-off (already parked).

## Added in the same pivot

- **Care reminders**: web push at breakfast, dinner, bedtime, and when a bar empties.
- **Photo Treat**: photograph something very Scottish; all bars refill, Mess clears, big XP boost. Recognition (Amazon Rekognition) connects after the button exists.
- **Life XP**: overall experience that grows with age and adventures (Dungeons & Dragons style), separate from Health XP.

## Lessons learned

1. **Test the whole journey on the real device early.** Each step passed its own test; the journey failed in the owner's hand on day one. A five-minute phone test on 16 Nov would have shown it before the hand-off code was hardened.
2. **Count the codes.** Every code or email is a place people drop out. Design target now: one code, once per phone.
3. **Platform rules decide architecture.** iPhone keeps home-screen app storage separate from Safari, and only home-screen apps get push. That fact, not a preference, put "install first" at the start of the flow.
4. **Security work survives a pivot if it sits on the server.** The bot check, rate limits and ownership checks moved over unchanged; only the browser flow was thrown away.
5. **Kiro's own failure on 16 Nov** (cron setup instructions, 2 hours lost) is recorded separately in `docs/INCIDENT-2026-11-16-cron-setup.md`. It produced the `owner-instructions.md` steering rule that every guide since follows.
6. **Write the pivot down the same day.** Specs that describe a design the product no longer has are worse than no specs (the 16 Nov handover found exactly that).

## Specs affected

| Spec | Change |
| --- | --- |
| `phone-home` | **New.** Install-first, one code, home device, watch mode, move here. |
| `care-reminders` | **New.** Web push, VAPID keys, 15-minute reminder job. |
| `photo-care` | **Updated.** Photo Treat button, Life XP, treat list; recognition later. |
| `nest-and-ready` | Phone hand-off sections superseded by `phone-home`. |
| `brood-sync` | R3 (send to phone by code) superseded by `phone-home` R4-R5. |
