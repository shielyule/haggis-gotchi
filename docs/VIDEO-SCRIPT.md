# Kiro - Demo video script (living document)

**Limit: 3 minutes.** Filmed on Android (screen recording) + Mac (Kiro and the mother page).
Judging: Potential impact, Technological implementation (Kiro), Design, Innovation, Presentation.
Kiro adds to this file as features land. Times are targets.

## Demo controls (set up before filming)

| Want to show | How |
| --- | --- |
| Birth without a 30-minute wait | Tick **Demo wait (~90s)** on the claim form |
| A weather reaction on demand | Add `?weather=storm` to the address (also `rain`, `hot`, `snow`, `frost`, `windy`, `sunny`, `crisp`, `grey`, `humid`). Applies once per kind of weather per day |
| Different temperaments reacting | See `docs/WEATHER-REACTIONS.md`; e.g. Douce + rain = big smile, Radge + hot = big sulk, Fair Wud + storm = delight |
| A notification right now | Tell Kiro "test reminder" (sends one to your phone) |
| Photo Treat | Any photo works until AWS recognition is switched on; then use a real Irn-Bru can |
| The playing film (after play-film is built) | Demo eggs unlock it 3 minutes after hatching |

Tip: in the installed app there is no address bar. Film weather reactions in Chrome
(open `haggisgotchi.com/?weather=storm`), or ask Kiro to add a hidden demo menu.

## Shot list

### 1. Hook and impact (0:00-0:20)
- Mother page on the Mac: "The cloud mother keeps the brood." QR on screen.
- Voice: "Tamagotchis lived in your pocket and died in a drawer. Haggis-gotchi is a wee Scottish folklore pet that lives on your phone and actually notices your world: your weather, your day, your Irn-Bru."

### 2. Born on the phone (0:20-0:50)
- Scan the QR with the Android phone. "Give your Haggling a home": Add to home screen.
- Open from the icon. One email code. Claim form (show the chaos slider: Douce to Fair Wud).
- Birth story beats during the demo wait. Hatch film. Name it.

### 3. The care loop (0:50-1:25)
- Feed, Cuddle, Walk: bars move, scrapbook lines in Scots voice, Life XP and Level bar.
- **Weather:** the chip ("Rain · 6°C · your area"). Then `?weather=storm`: the **morning-swing banner** and the scrapbook line ("met the thunder head-on and had to be talked down off the dresser").
- Voice: "Every temperament feels weather differently. Douce loves rain. Skeigh hides from thunder. Fair Wud loves any change at all."
- **Photo Treat:** camera, snap, every bar fills, +50 Life XP.
- A **notification** arriving on the lock screen: "Breakfast for Wee Yin".

### 4. How Kiro built it (1:25-2:25), the longest section
Screen-record Kiro in `haggis-gotchi-app`:
- `.kiro/specs/`: open one spec (weather-mood): requirements (EARS) -> design -> tasks with honest ticks.
- `.kiro/steering/`: product, Scottish folklore tone, security, **owner-instructions** (born from a real failure).
- `.kiro/hooks/`: secret-guard blocking a key-shaped string; domain-language guard; schema reminder.
- **MCP:** our own `haggis-weather` MCP server answering a live weather call, and the AWS documentation MCP server.
- Shared care engine: one set of rules on phone, nest and server; property tests.
- `docs/PIVOT-2026-11-17-phone-first.md` and the incident record: "Kiro got it wrong once, we wrote it down, and changed the rules."
- Voice: "Every feature went spec, design, tasks, code, and the commits say which task."

### 5. Design and innovation (2:25-2:50)
- Architecture slide: phone (home device) <-> Supabase (care engine on the server, cron jobs: weather 3x a day, reminders every 15 min) <-> mother page.
- What is new: real weather + folklore temperaments + one-pet-many-devices, as a web app with no app store.

### 6. Close (2:50-3:00)
- Haggling on the phone, rain outside the window if Scotland obliges.
- "Get your own egg at haggisgotchi.com."

## To add when built
- Public scrapbook feed on the mother page ("Fred just fed Harry").
- Share card preview in WhatsApp.
- The 24-hour playing film arriving.
- Real photo recognition of an Irn-Bru can (AWS Rekognition).
