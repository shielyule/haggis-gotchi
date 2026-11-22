# Kiro - Requirements: public-feed (queued item A)

Status: DRAFT for owner approval (17 Nov 2026). Opt-out decided by owner: a tick box.

## Overview
The mother's page shows a live, public scrapbook of the whole brood: the last 10
things carers did, one line each. "Fred just fed Harry." "Sally just cuddled Twinkle."
"Billy just shared a Photo Treat with Tigger."

## Requirements (EARS)
1. THE mother page SHALL show the latest 10 brood events, newest first, refreshed every 30 seconds.
2. Each line SHALL use only the carer's display name (what the mother calls them), the Haggling's name, the action and how long ago ("2 min ago").
3. THE SYSTEM SHALL NOT show emails, nest slugs, locations, weather places or any signup answer except the display name.
4. WHEN a carer has untucked "Show my Haggling in the mother's public scrapbook", THE SYSTEM SHALL leave their events out (past and future).
5. THE tick box SHALL be on the claim form (off by default; *updated 22 Nov 2026: owner decision of 19 Nov*) and on the care screen.
6. WHEN the same carer does the same action to the same Haggling within 10 minutes, THE SYSTEM SHALL show one line.
7. Lines: feed "fed", cuddle "cuddled", walk "took {h} for a walk", treat "gave {h} a treat", clean "cleaned up after", Photo Treat "shared a Photo Treat with" (later the treat name, e.g. "shared a can of Irn-Bru with").
8. IF a name contains a blocked word, THEN THE SYSTEM SHALL hide that line.
9. WHEN there are no events, THE SYSTEM SHALL show "Quiet in the glen. Claim an egg to start the story."

## Security considerations
Public read through one database function (`public_feed()`), callable without sign-in, returning only the fields in R2. No table becomes public. Opt-out honoured inside the function. Names are already limited to letters, numbers, spaces, apostrophes and hyphens (claim-egg).

## Non-goals
Comments, likes, following carers, a feed on the phone screen.
