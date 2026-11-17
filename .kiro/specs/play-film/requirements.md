# Kiro - Requirements: play-film (queued item H)

Status: DRAFT for owner approval (17 Nov 2026). Videos supplied by owner.

## Overview
24 hours after hatching, each Haggling's "playing" film arrives: a phone
notification, an email, and the film unlocks in **Watch again**.

## Videos (owner, in `Desktop/Haggis-gotchi/Haggis images/Haggis-gotchi_baby_animations`)
| Temperament | Source file | Repo file |
| --- | --- | --- |
| Douce | `Dounce_baby_playing.mp4` | `haggling-play-douce.mp4` |
| Skeigh | `Skeigh_baby_playing.mp4` | `haggling-play-skeigh.mp4` |
| Ill-trickit | `Ill-trickit_baby_playing.mp4` | `haggling-play-ill-trickit.mp4` |
| Ree | `Ree_baby_playing.mp4` | `haggling-play-ree.mp4` |
| Radge | `Radge_baby_playing.mp4` | `haggling-play-radge.mp4` |
| Fair Wud | `Fair Wud_baby_playing.mp4` | `haggling-play-fair-wud.mp4` |

Question for owner: `Drop-Rae_baby_playing.mp4` is in the same folder and matches no temperament. Leave it out?

## Requirements (EARS)
1. WHEN 24 hours have passed since hatching, THE SYSTEM SHALL send one phone notification "Look what {name} has been up to!" to devices with reminders on.
2. WHEN 24 hours have passed, THE SYSTEM SHALL send one email with the same message and a link to the app, unless the carer has reminders on and the notification was delivered (one message, not two, matching the egg-ready rule).
3. FROM 24 hours after hatching, THE "Watch again" list SHALL include "Playing: {temperament}" with that temperament's film.
4. WHERE the egg was claimed with the demo wait, the 24 hours SHALL be 3 minutes (for filming the video).
5. Each Haggling SHALL get the film message at most once.

## Security considerations
Email text escaped like the ready email; link has no personal data; sent by the existing cron-secret job. Films are static public files (no personal data).

## Non-goals
Choosing a film, uploading your own films, more growth films (later, same mechanism).
