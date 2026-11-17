# Kiro - Android test: phone-first Haggling, reminders, Photo Treat

**Status:** server parts **tested by Kiro** on the live project (database checks in a
rolled-back transaction; functions called live). The phone screens are **not tested
on a phone yet**. This guide is that test.

**Use only `haggisgotchi.com`.** Not phone.haggisgotchi.com (it is being retired and
the server does not accept claims from it).

## Before you start (once)

1. Push the code (Terminal):
   ```bash
   cd /Users/shielyule/Desktop/haggis-gotchi-app && git push origin main
   ```
   **You should see:** a line ending in `main -> main`.
2. Cloudflare -> **haggis-gotchi-mother** -> **Deployments**: wait for the newest line to say **Success**.
3. Tell Kiro "built". Kiro checks the live site has the new version before you test.

## The test (about 10 minutes, demo wait on)

| # | Do this | You should see |
| --- | --- | --- |
| 1 | On the **Mac**, open haggisgotchi.com | The mother, with a QR code: "Your Haggling lives on your phone" |
| 2 | On the **Android phone**, open the camera, point it at the QR, tap the link | Chrome opens "Give your Haggling a home" |
| 3 | Tap **Add to home screen** (or follow the ⋮ menu steps shown), then **Install** | A Haggis-gotchi icon on your home screen |
| 4 | Open **Haggis-gotchi from the icon** (not the Chrome tab) | Full screen app: "Start here" |
| 5 | Enter your email, **Send code**, type the 6 digits from the email, **Verify** | The claim form, with your email already filled in |
| 6 | Leave **Demo wait** ticked. Fill the form, tick "I am human", **Start demo birth** | Countdown with the birth story |
| 7 | After about 90 seconds | "Ready for you" and an enabled **Hatch** button (no second code needed) |
| 8 | **Hatch**, watch the film, name it, **Begin care** | Care screen with Level 1 and the Life XP bar |
| 9 | Tap **Turn on reminders**, then **Allow** | "Reminders on." |
| 10 | Tap **Feed** and **Walk** | Bars change, scrapbook lines appear, Life XP goes up by 1 each |
| 11 | Tap **Photo Treat**, take a photo of anything | Hunger, Mood, Energy jump to 100, Mess to 0, Life XP +50. Note says recognition is not switched on yet |
| 12 | Tap **Photo Treat** again | "has had today's treat already. Come back tomorrow!" |
| 13 | Close the app. Wait for the next meal hour you set (or ask Kiro to trigger a test reminder) | A notification from Haggis-gotchi. Tapping it opens the app |
| 14 | On the **Mac**, scroll to **Retrieve my Haggling**, sign in with the same email, tap your Haggling | It opens read-only with "Watching" and **Move here** |
| 15 | On the phone, reopen the app | Still yours to care for (the phone is home) |

**If any row is different:** stop, note the row number and what you saw (a screenshot is perfect), tell Kiro.

## Faster reminder test

Waiting for a meal hour is slow. Tell Kiro "test reminder" after row 9 and Kiro will
send one test notification to your phone straight away.

## Known limits (honest list for the write-up)

- Photo Treat recognition is a placeholder: any photo counts. AWS Rekognition connects next (`photo-care` T5-T7).
- Turnstile uses Cloudflare's test key ("For testing only" banner).
- Reminders check every 15 minutes, so a meal reminder can arrive up to 15 minutes into the hour.
