# Kiro - Requirements: share-card (queued item E)

Status: DRAFT for owner approval (17 Nov 2026).

## Overview
"Share on social" links to a public, read-only card for that Haggling: name,
portrait, temperament, level, bars, the hatching film, and **Get your own egg**.

## Requirements (EARS)
1. Each hatched Haggling SHALL have a random public id (10 characters) unrelated to its name, slug or carer.
2. THE card SHALL live at `haggisgotchi.com/h/<public id>` and work without sign-in.
3. THE card SHALL show: name, portrait, temperament (name + short description), Level and Life XP, the five bars (read-only), hatch film, days old, and a "Get your own egg" button to the home page.
4. THE card SHALL NOT show the carer's name or email, nest slug, schedule, location or scrapbook.
5. WHEN shared to WhatsApp, Instagram, X or Facebook, THE link SHALL show a preview: "{name} the {temperament} Haggling", the portrait, and "Get your own Haggis-gotchi egg".
6. "Share on social" on the care screen SHALL share the card link.
7. THE carer SHALL be able to switch the card off; a switched-off card SHALL show "This Haggling is keeping to themselves" and still offer "Get your own egg".
8. WHEN the Haggling has departed (lifespan-graveyard, later), THE card SHALL show it as a memorial.

## Security considerations
Read through one function `public_haggling(public_id)` returning only R3 fields. Ids are random, so cards cannot be listed or guessed from names. Link previews come from a Cloudflare Pages Function that uses the public (publishable) key only.

## Non-goals
Public profile pages for carers, comments, live updating cards.
