# Kiro - Ideas and future development

Owner's backlog. **Queued** items get a spec before any code. **Future** items are
logged so they are not lost; nothing is built for them yet.

Order agreed 17 Nov 2026: Android test -> `weather-mood` (today) -> queued items below.

## Queued -> BUILT 17 Nov (phone test pending): `public-feed` (A), `share-card` (E), `play-film` (H)

### A. Mother's public scrapbook feed
On the desktop mother page, a "Scrapbook" feed everyone can see: the last 5 to 10
things that happened across the whole brood, one line each.
- Examples: "Fred just fed Harry", "Sally just cuddled Twinkle", "Billy just shared a can of Irn-Bru with Tigger".
- Uses the carer's **display name** and the Haggling's name only. Never email, never slug.
- Proposed: a public, read-only database view of the latest care events (name, Haggling, verb, time) built from `check_ins` + Photo Treats; the page polls it every 30 seconds.
- Decisions for the spec: opt-out for carers who want to stay private (proposal: on by default, toggle in settings); language filter on names (display names are free text).

### E. Public Haggling card for sharing
"Share on social" currently links to the home page. Instead, each hatched Haggling gets a
public, read-only card: name, portrait, temperament, level and bars (no buttons),
the hatching film, and a **"Get your own egg"** button.
- URL proposal: `haggisgotchi.com/h/<random-id>` (not the nest slug, not guessable from a name).
- Social preview image and title (Open Graph tags) so the link shows the Haggling in WhatsApp/Instagram/X.
- Decisions: what stats are public; can a carer turn the card off.

### H. "Playing" film 24 hours after hatching
One "playing" video per temperament. 24 hours after hatching:
- an email ("Look what {name} has been up to") with a link,
- a phone notification (care-reminders job),
- the film unlocks in **Watch again**.
- Needs from owner: the six video files, named `haggling-play-<temperament>.mp4` (douce, skeigh, ill-trickit, ree, radge, fair-wud), dropped into `apps/mother/public/art/`.
- Fits the existing `memoryFilms` slot on the Haggling and the 15-minute reminder job.

## Future development (logged, not scheduled)

### B. Explorable 3D isometric graveyard
The mother's graveyard as a 3D isometric scene a carer can explore: headstones for
departed Hagglings, heather, mist, a wee kirk. Tap a stone to read the epitaph and the
last scrapbook pages; read-only ghosts drift between stones.
- Depends on `lifespan-graveyard` (lifespan length still to be decided).
- Possible tech: Three.js or a pre-rendered isometric tile set (lighter on phones).
- Out of scope for Kiroween: the hackathon graveyard is a simple list.

### From earlier notes (`Kiroween/IDEA.md`)
- Life stages after Baby: Child (Body/Brain XP), Teen (opt-in identity morphing), Young Adult, Adult.
- Dating / nearby gotchis, cloud "graduation" to a new mother, other folklore beasts.
- Costumes, seasonal skins, player costume contests, store and merch.
- Raspberry Pi "hearth" body (parked for QNX).
- Treat list from photo recognition can grow beyond the first 3-5 treats.
