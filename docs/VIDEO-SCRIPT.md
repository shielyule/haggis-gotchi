# Kiro - Demo video script (living document)

**Limit: 3 minutes.** Filmed on Android (screen recording) + Mac (Kiro and the mother page).
Judging: Potential impact, Technological implementation (Kiro), Design, Innovation, Presentation.
Kiro adds to this file as features land. Times are targets.

## Demo controls (set up before filming)

| Want to show | How |
| --- | --- |
| Birth without a 30-minute wait | Open `haggisgotchi.com/?demo=1&new=1`, then tick **Demo wait (10 seconds)** (the box only shows with `?demo=1`; real eggs take 20 seconds); the still egg shows, then the hatch film plays by itself |
| A weather reaction on demand | Add `?weather=storm` to the address (also `rain`, `hot`, `snow`, `frost`, `windy`, `sunny`, `crisp`, `grey`, `humid`). Applies once per kind of weather per day |
| Different temperaments reacting | See `docs/WEATHER-REACTIONS.md`; e.g. Douce + rain = big smile, Radge + hot = big sulk, Fair Wud + storm = delight |
| A notification right now | Tell Kiro "test reminder" (sends one to your phone) |
| Photo Treat | Film with **shortbread, heather, tartan or bagpipes**. Do not show an Irn-Bru or Coke can on video (trademarks, see `docs/SUBMISSION-VIDEO-CRIB.md`); a plain mug is refused instead. Once a day per Haggling |
| The playing film | Demo eggs unlock it 3 minutes after hatching: notification + "New film in Watch again" |
| Mist / haar love | Demo menu: Mist and fog (+8 Mood for all), Haar (+10) |
| Public scrapbook | Mother page on the Mac shows "Fred just fed Harry · 2 min ago" as you care on the phone |
| Growing up + identity | Opted-in demo egg: demo menu **Next stage** (or **+1 day**) to Teen: the "Growing up" pop-up with the teen picture; a teen pushes a cuddle away ("Really?!"), and the Haggling tells you who they are; tap **Give them a big hug** |
| Put to bed | Tap **Put to bed** (Zzz badge), then demo menu **Wake up now**: rested wake-up line. Or feed it while asleep: "crabbit" |
| Life stages + graveyard | Demo egg: demo menu -> **Next stage** (Baby -> Child -> Teen -> Adult -> Old age) or **Skip to the end** -> final page, epitaph, ghost choice; Mac mother page shows the new stone |
| Share card | Share on social -> WhatsApp shows "{name} the {temperament} Haggling" with the portrait |

**Hidden demo menu (works in the installed app):** tap the Haggling's name **5 times
quickly**. Buttons for all 12 kinds of weather (each once per day). Tap the name 5 times
again to hide it.

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
- **Haggis Run** (guess which way they run round the hill) and **Tell off** when the mischief banner shows. Poop on the portrait, then Clean up. Chirps on (record media sounds).
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
- Shared care engine: one set of rules on phone, nest and server; 161 tests incl. 45 property-based tests written from the specs, which caught the "bars freeze while the app is open" bug; GitHub CI.
- `docs/PIVOT-2026-11-17-phone-first.md` and the incident record: "Kiro got it wrong once, we wrote it down, and changed the rules."
- Voice: "Every feature went spec, design, tasks, code, and the commits say which task."

### 5. Design and innovation (2:25-2:50)
- Architecture slide: phone (home device) <-> Supabase (care engine on the server, cron jobs: weather 3x a day, reminders every 15 min) <-> mother page.
- What is new: real weather + folklore temperaments + one-pet-many-devices, as a web app with no app store.

### 6. Close (2:50-3:00)
- Haggling on the phone, rain outside the window if Scotland obliges.
- "Get your own egg at haggisgotchi.com."

### Extra shots now available (fit into sections 3 and 5)
- Split screen: feed on the phone, the Mac mother page's public scrapbook updates ("Fred just fed Harry").
- Share to WhatsApp: the link preview card, then tap it to show the public card and "Get your own egg".
- Demo egg's playing film notification after 3 minutes, then play it in Watch again.

### AWS shots
- Photo Treat on shortbread: every bar full, and the Mac feed says "... shared some shortbread with Firecracker". (No Irn-Bru or Coke cans on screen: trademarks.)
- Then a plain mug: "squints... not a Scottish treat".
- Kiro: the fixtures file of real Rekognition answers and the 15 photo tests.
