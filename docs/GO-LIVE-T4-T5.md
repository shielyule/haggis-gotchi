# Kiro - Go live: safer egg claims and phone hand-off (T4 + T5)

**Status:** database parts **tested by Kiro** on the live project (inside a
transaction that was rolled back). The website screens are **not tested in a
browser yet**. Your test in Part 4 is that test.

**Checked on 16 Nov 2026:** Supabase changelog (30 Oct grants change),
Cloudflare Turnstile docs (test keys and server check).

You do 3 small things. Kiro does the database switch-over in between.

## Where we are (checked by Kiro, 16 Nov evening)

| Part | Status |
| --- | --- |
| 1 Cloudflare setting | **Not live yet.** The live mother site has no Turnstile key in it, so the claim form will say the bot check is not configured. Do Part 1, then **Deployments -> Retry deployment** on haggis-gotchi-mother (the setting only takes effect on a new build). |
| 2 Push | **Done.** GitHub matches the Mac. |
| 3 Kiro switch-over | **Done.** Backup saved, test data wiped (sign-in kept), old claim path closed, hand-off fields locked, claim-egg re-checked (200). |
| 1b Phone site | **Problem found.** phone.haggisgotchi.com and haggis-gotchi-phone.pages.dev both serve the **Mother** app, not the phone app. See Part 1b. |
| 4 Phone test | After 1 and 1b. |

## Part 1b - Point the phone project at the phone app (3 minutes)

1. Cloudflare -> **Compute** -> **Workers & Pages** -> click **haggis-gotchi-phone**.
2. **Settings** -> find **Build** (or **Build configuration**).
3. Read the three values. They must be exactly:
   - Root directory: `apps/phone`
   - Build command: `npm run build`
   - Build output directory: `dist`
4. If any differs, click **Edit**, fix it, **Save**.
5. **Deployments** -> **Retry deployment**. Wait for **Success**.

**You should see:** opening phone.haggisgotchi.com shows the page title "Haggis-gotchi — Phone" and the words "Collect your Haggling".
**If the three values were already right:** do not change anything. Click the newest deployment, copy the last 20 log lines, and paste them to Kiro. Also check **Custom domains** on both projects: phone.haggisgotchi.com must be listed under haggis-gotchi-phone, not haggis-gotchi-mother.

---

## Part 1 - Add one setting to Cloudflare (2 minutes)

This is the public "I am human" box key. It is Cloudflare's **test** key, so it is
not a new key and not a secret.

1. Go to **dash.cloudflare.com** and sign in.
2. Left menu: **Compute** -> **Workers & Pages**.
3. Click **haggis-gotchi-mother**.
4. Top tabs: **Settings**. Find **Variables and Secrets** (same place as your
   `VITE_SUPABASE_URL`).
5. Make sure it says **Production**.
6. Click **Add**. Name: `VITE_TURNSTILE_SITE_KEY`. Value: `1x00000000000000000000AA`. Type: plain text.
7. Click **Save**.

**You should see:** `VITE_TURNSTILE_SITE_KEY` in the list next to `VITE_SUPABASE_URL`.
**If you cannot find the page:** stop and tell Kiro what tabs you see.

Do **not** add it to haggis-gotchi-phone. The phone does not need it.

---

## Part 2 - Push the code (1 minute)

Pushing to GitHub **also publishes the live site** (Cloudflare builds from GitHub).

1. Open **Terminal**.
2. Paste this and press Enter:

```bash
cd /Users/shielyule/Desktop/haggis-gotchi-app && git push origin main
```

**You should see:** a line ending in `main -> main`.
**If you see `rejected` or `fetch first`:** stop and paste Kiro the whole message. Do not force anything.

3. Go back to Cloudflare -> **haggis-gotchi-mother** -> **Deployments**.
4. Wait until the newest line says **Success** (usually 1 to 3 minutes).
5. Do the same check for **haggis-gotchi-phone**.

**If a deployment says Failed:** click it, copy the last 20 lines of the log, paste them to Kiro.

---

## Part 3 - Tell Kiro "pushed"

Kiro then does this, in order, and shows you the output:

1. Saves a backup of the test data to `backups/` on this Mac (never committed).
2. Wipes old test eggs and Hagglings (your clean slate). Your sign-in email stays.
3. Switches off the old claim path and locks hand-off fields (phase 2).
4. Checks that each step worked.

Every browser also starts fresh by itself (the app now uses new storage names).

---

## Part 4 - Test on a real phone (10 minutes)

Use the **live** sites, not localhost (a phone cannot open your Mac's localhost).

| # | Do this | You should see |
| --- | --- | --- |
| 1 | On the Mac, open **haggisgotchi.com**, tick **Demo wait**, press **Claim an egg** | The form, with an "I am human" box near the bottom that says it is for testing |
| 2 | Fill it in with your email, tick the box, press **Start demo birth** | A new tab opens at haggisgotchi.com/your-name with a countdown |
| 3 | Wait 90 seconds | "Ready for you" and a 6-digit code arrives by email |
| 4 | Type the 6-digit code, press **Verify**, then **Hatch**, then name it | The hatch film, then the care screen |
| 5 | Press **Feed** and **Walk** | Meters change, scrapbook lines appear |
| 6 | Press **Send to phone** | A square QR code, a 6-letter claim code, "Waiting for your phone..." |
| 7 | On the phone, open the camera, point it at the QR, tap the link | phone.haggisgotchi.com with "Step 1 Sign in" and the claim code filled in |
| 8 | On the phone, enter your email, get the 6-digit email code, verify | Your Haggling appears on the phone by itself |
| 9 | Look at the Mac within 5 seconds | "Living on your phone", buttons gone (read-only) |
| 10 | On the phone, press Feed | Works on the phone |
| 11 | On the Mac, press **Bring back to this nest** | Care buttons return on the Mac. Within a minute the phone says it went back |

**If any row is different:** stop, note the row number and what you saw, tell Kiro.

**To undo the whole website change:** Cloudflare -> haggis-gotchi-mother ->
Deployments -> the previous Success line -> **...** -> **Rollback to this deployment**.
(Same for phone.) Tell Kiro, so the database matches.

---

## Before the hackathon submission (later, needs a Cloudflare login)

The test key lets everyone through, so it does not stop bots yet. Validation and
rate limits (3 eggs per email per day, 10 per connection per hour) do work now.
For real protection: Cloudflare -> **Turnstile** -> **Add widget** -> name
`haggis-claim`, hostname `haggisgotchi.com` -> put the new site key in Part 1's
setting, and run `supabase secrets set TURNSTILE_SECRET=<new secret>`.
