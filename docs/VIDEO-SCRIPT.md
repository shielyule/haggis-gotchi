# Kiro - Demo video script (updated 25 Nov 2026)

**Limit: under 3 minutes. Aim for 2:50.** Judges stop at 3:00.
Filmed on Android (screen recording + a real phone in a hand) and the Mac (Kiro, the mother page).
Judging, 20% each: Potential impact, Technological implementation (Kiro), Design, Innovation, **Presentation**
(Best Demo is scored on Presentation). How to film, edit and upload: `docs/SUBMISSION-VIDEO-CRIB.md`.

**Voice-over budget:** about 150 words a minute, so **about 380 spoken words** in total. Each section below
gives its word count. If a section runs long, cut words, not shots.

**Numbers you can say (checked 25 Nov):** 17 specs · 6 steering files · 4 hooks · 2 MCP servers ·
178 tests, 62 of them property-based · the property tests found 11 real problems (8 code bugs, 3 spec or design gaps) · 36 films · 30 costumes.

---

## Before filming (once)

1. **Phone:** Do not disturb on (allow Haggis-gotchi), screen timeout 10 min, battery 80%+, camera lens clean.
2. **Demo egg:** open `haggisgotchi.com/?demo=1&new=1`, tick **Demo wait (10 seconds)**, tick both
   **teen identity** boxes and the **18 or older** box. Claim. Call it something short, e.g. **Wee Yin**.
3. **Sign in on the Mac** for the mother-page shots: `haggisgotchi.com/mother` -> **Retrieve my Haggling** -> same email.
4. **Hidden demo menu:** tap the Haggling's name **5 times quickly**. Tap 5 times again to hide it.
5. **Use a throwaway email** on screen, or blur it. Never film `.env` files or the Supabase **Secrets** page.
6. **No Irn-Bru or Coke cans on screen** (trademarks). You may *say* "Irn-Bru". Film shortbread, heather or tartan.

## Demo controls

| Want to show | How |
|---|---|
| Birth without waiting | `?demo=1&new=1`, tick **Demo wait**: still egg, birth story, hatch film plays by itself |
| Weather reaction now | Demo menu weather buttons (12 kinds, each once a day), or add `?weather=storm` to the address |
| Mischief and Tell off | Wait for the orange **mischief** banner (Fair Wud and Radge misbehave most), then **Tell off** |
| Haggis Run | Gold **Haggis Run** button: five guesses, clockwise or anticlockwise |
| Folklore riddle | Gold **Folklore riddle** button: one hand-written riddle a day, one guess per Haggling |
| Photo Treat | Point at **shortbread, heather or tartan**: every bar fills |
| "What's that?" (AI) | Photo Treat on anything else (a dog, a plant, a teapot): the Haggling reacts in its own words (Google Gemini) |
| AI diary now | Demo menu **Write tonight's diary now** (says if the AI wrote it), then **Open scrapbook** |
| The scrapbook book | **Open scrapbook** on the care screen, or on the Mac mother page. The opening film plays once per device (**Watch it open again** replays it) |
| Growing up + identity | Demo menu **Next stage** to Teen: Growing-up pop-up and film; the Haggling tells you who they are; **Give them a big hug** |
| Seasonal costumes | On a Child: demo menu **Costume preview** (Halloween, St Andrew's Day, Christmas, Burns Night, Easter). **Real St Andrew's costumes show 28 Nov - 1 Dec**: film then for free |
| Sleep | **Put to bed** (Zzz badge), then demo menu **Wake up now** |
| End of life | Demo menu **Skip to the end**: epitaph, ghost choice; then the stone in the kirkyard (`/haggis-graveyard`) |
| Public scrapbook | Feed on the phone; the Mac mother page shows "Shiel just fed Wee Yin · just now" (your first name) |
| Quick settings | Tap the **Sounds / Quiet nights / Public card / Brood book** tiles |
| A notification now | Tell Kiro "test reminder" |
| Share card | **Share Wee Yin** -> WhatsApp shows the portrait card |

---

## Shot list and voice-over

### 1. Hook (0:00 - 0:15) · about 35 words
**Picture:** the phone in a hand, outside, ideally in rain or haar. Cut to the care screen: Wee Yin, the rain chip.
**Voice:**
> "Tamagotchis lived in your pocket and died in a drawer. Meet Haggis-gotchi: a wee Scottish folklore pet that
> lives on your phone and notices your real world. Your weather, your day, your Irn-Bru."

### 2. Born on the phone (0:15 - 0:40) · about 50 words
**Picture:** Mac mother page with the QR -> phone scans it -> **Add to home screen** -> open from the icon ->
one email code -> claim form (slide the temperament from Douce to Fair Wud) -> birth story beats -> hatch film -> name it.
**Voice:**
> "Scan the mother's code. No app store: it installs from the browser. One email code, a few questions, and
> the mother writes your egg a birth story. Six Scots temperaments, from douce to fair wud. Twenty seconds
> later, it hatches."

### 3. Living with it (0:40 - 1:20) · about 85 words
**Picture, quick cuts (2-4 s each):** Feed and Cuddle (bars move, scrapbook line) -> the **mischief** banner -> **Tell off**
-> **Haggis Run** (two guesses) -> demo weather **Storm**: the swing banner -> **Photo Treat** on shortbread: bars fill ->
**"What's that?"** on a dog: the AI reaction -> **Folklore riddle**: pick an answer -> a lock-screen notification ("Breakfast for Wee Yin").
**Voice:**
> "Feed, cuddle, walk. Tell them off, but only when they've earned it. Play Haggis Run: a wild haggis has
> longer legs on one side, so guess which way it runs. They feel your real weather: Douce loves rain, Skeigh
> hides from thunder. Snap shortbread and every bar fills. Show them anything else and they'll tell you what
> they think. A folklore riddle every day. And they'll tell you when they're hungry."

### 4. A life, and a book (1:20 - 1:50) · about 60 words
**Picture:** demo menu **Next stage** -> Growing-up pop-up and stage film -> **Costume preview: St Andrew's Day** ->
**Write tonight's diary now** -> **Open scrapbook**: the book opening film -> turn a page -> **Skip to the end** -> the epitaph ->
the Mac: the painted kirkyard with the new stone.
**Voice:**
> "Over six weeks they grow up: child, teen, adult, old age, with new art, films and costumes. Every night they
> write a diary from their real day, the weather in your town, the care they had, and it goes in a scrapbook
> that keeps every page. And when the six weeks are up, a stone in the kirkyard."

### 5. How Kiro built it (1:50 - 2:40) · about 120 words
**Picture (Mac, Kiro in `haggis-gotchi-app`, font bigger with Cmd +):**
1. `.kiro/specs/seasonal-costumes/`: requirements (EARS) -> design with **correctness properties** -> tasks ticked.
2. `.kiro/steering/`: scroll the list; open `owner-instructions.md` (written after a real incident).
3. `.kiro/hooks/`: the secret guard blocking a key-shaped string; the hook that updates property tests when a requirement changes.
4. A property test failing with its shrunk counterexample (e.g. the "00000" name), then passing.
5. GitHub CI green, and the Cloudflare build running the tests before it deploys.
6. The `haggis-weather` MCP server answering a weather call.
7. One line of the AWS incident record (optional, see note below).

**Voice:**
> "Every feature started as a Kiro spec: requirements, design, tasks. Kiro turned the requirements into 62
> property tests that throw hundreds of random Hagglings at each rule. They found 11 real problems, like bars that
> froze while you watched. Steering holds our rules, including ones we learned the hard way. Hooks keep
> secrets out of the code and the tests in step with the specs. Our own MCP server tells Kiro how each
> temperament feels the weather. And when Amazon Bedrock gave our new account zero tokens, the written
> fallbacks kept the game running, and we moved to Gemini in an afternoon."

**Note on the AWS line:** it is true and documented (`docs/INCIDENT-2026-11-23-aws-bedrock-quota.md`), and AWS is
the sponsor. Keep it factual and short as written, or cut the last sentence. The full story goes in the Devpost
write-up and the sponsor-feedback box either way.

### 6. Design and close (2:40 - 2:55) · about 30 words
**Picture:** scroll the care screen (cards, gold game buttons, Quick settings tiles) -> the phone in a hand at the
window -> end card: **haggisgotchi.com**.
**Voice:**
> "Real weather, real folklore, one pet that's never copied, only moved. No app store needed. Get your own egg
> at haggisgotchi dot com."

---

## Shooting order (saves resetting the demo egg)
1. **Mac first:** Kiro shots (section 5), the mother page with the QR, the painted kirkyard (no stone yet).
2. **Phone, new demo egg:** install, claim, birth, hatch, name (section 2).
3. **Phone, Baby:** feed, cuddle, Haggis Run, Tell off (wait for the banner), Photo Treat, "What's that?", riddle, storm weather.
4. **Phone, growing up:** Next stage to Child -> costume preview -> Next stage to Teen (identity moment) -> Write tonight's diary now -> Open scrapbook.
5. **Notification:** ask Kiro for a "test reminder" while the phone is locked.
6. **Last:** Skip to the end -> epitaph -> Mac kirkyard shows the new stone.
7. **Outside:** the phone in a hand, landscape, daylight (sections 1 and 6).

## Spare shots (if a section needs filling)
- Split screen: feed on the phone, the Mac public scrapbook updates within 30 seconds.
- Share to WhatsApp: the link preview card, then the public card's "Get your own egg".
- Watch again: a stage film (each of the six types has child, teen, adult and old-age films).
- A Haggling asleep (Zzz) woken crabbit by feeding.

## Do not show
- Irn-Bru or Coke cans, or chart music (trademarks and copyright).
- Your real email, the Supabase Secrets page, `.env` files, or any key.
