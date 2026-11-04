# Requirements: brood-sync

## Overview

Episodic sync between the cloud mother and a child device (phone, extension, or optional Pi). One child identity; multiple bodies allowed only as paired surfaces of that identity.

## User stories

### Hatch

**As** a carer who claimed an egg, **I want** traits pushed to my device at hatch, **so that** the baby I raise matches the mother’s birth record.

Acceptance:

- Hatch payload includes looks, temperament, family quirk, culture pack (Scottish for gen-zero), birth story id.
- Device stores child id issued by mother; cannot mint a second id locally.
- Mother marks egg as hatched and links device surface(s).

### Check-in

**As** a carer, **I want** vitals and care events uploaded when online, **so that** the mother page shows how the child is doing.

Acceptance:

- Payload includes hunger, mood, energy, last care events, timestamps, optional joke-economy garnish counters.
- Offline device continues decaying meters with a local clock.
- On reconnect, device sends check-in; mother updates brood view.

### Conflict

**As** the system, **I want** boring conflict rules, **so that** two bodies never fork into two pets.

Acceptance:

- Traits after hatch are immutable except via explicit mother events.
- Meter values: latest timestamp wins; if equal, mother wins.
- Pairing a Pi attaches a surface to the same child id; never creates a sibling.

### Mother consequence

**As** a carer viewing the mother site, **I want** the mother/brood state to reflect neglect or care, **so that** sync feels consequential.

Acceptance:

- Sustained low mood / neglect darkens scrapbook tone and mother presentation.
- Fixed lifespan countdown is authoritative on mother; devices display remaining span from last sync + local elapsed.

## Non-goals (MVP)

Realtime websocket mirroring, multiplayer brood chat, dating proximity, crypto wallets.
