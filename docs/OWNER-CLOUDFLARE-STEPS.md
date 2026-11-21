# Kiro - Two Cloudflare jobs for the owner (real "I am human" key, phone redirect)

**Not tested by Kiro.** Kiro cannot sign in to Cloudflare. Kiro checks the result
from outside afterwards (step 4 of each part).
**Checked on 22 Nov 2026:** Cloudflare Turnstile docs (widget "Region" setting is
new; CSP needs `challenges.cloudflare.com`, already in `apps/mother/public/_headers`)
and the Redirect Rules docs.

Never paste a secret key into the chat.

---

## Part A - Real Turnstile key (the "I am human" box)

Today the site uses Cloudflare's **test** key, which lets every bot through.
The order below means sign-ups keep working the whole time:
the live server still has the test secret, and the test secret accepts any token.

### Pre-flight
- You can sign in at **dash.cloudflare.com**.
- In **Workers & Pages -> haggis-gotchi-mother -> Settings -> Variables and Secrets**
  you can see `VITE_TURNSTILE_SITE_KEY` (value `1x00000000000000000000AA`).

### A1. Make the widget
1. dash.cloudflare.com -> left menu **Turnstile** -> **Add widget**.
2. **Widget name:** `haggis-claim`
3. **Region:** **Rest of World**. (It cannot be changed later.)
4. **Hostname management:** add `haggisgotchi.com`, then `www.haggisgotchi.com`,
   then `haggis-gotchi-mother.pages.dev`.
5. **Widget mode:** **Managed**.
6. Leave **Pre-clearance** off. Click **Create**.

**You should see:** a **Site Key** (starts `0x`) and a **Secret Key**.
Keep this tab open.

### A2. Put the site key in the website (public, not secret)
1. New tab: **Workers & Pages -> haggis-gotchi-mother -> Settings -> Variables and Secrets**.
2. Make sure it says **Production**.
3. Find `VITE_TURNSTILE_SITE_KEY` -> **Edit** -> paste the **Site Key** -> **Save**.
4. Top tabs: **Deployments** -> on the newest one, click **...** -> **Retry deployment**.

**You should see:** a new deployment that turns green in about 2 minutes.
**If it fails:** stop and paste Kiro the last red line of the build log.

### A3. Put the secret key in Supabase (secret)
1. Go to **supabase.com/dashboard** -> project **haggis-gotchi** ->
   **Edge Functions** -> **Secrets**.
2. Find `TURNSTILE_SECRET` -> edit -> paste the **Secret Key** from A1 -> **Save**.

**You should see:** `TURNSTILE_SECRET` with a new "updated" time.

### A4. Test
1. On your Android phone, open **haggisgotchi.com/?new=1** and claim an egg.
2. Tell Kiro "Turnstile done". Kiro checks the live build uses the new key.

**If the claim says the human check failed:** the site key and secret key are from
different widgets. Do A2 and A3 again with the keys from the same widget.

---

## Part B - Send phone.haggisgotchi.com to haggisgotchi.com

`phone.haggisgotchi.com` still serves the **old** phone app (project
`haggis-gotchi-phone`). Old links should land on the real site instead.

### Pre-flight
- dash.cloudflare.com -> **haggisgotchi.com** (the domain) -> **DNS -> Records**:
  there is a `phone` record with an **orange cloud** (Proxied). Redirects only work
  when it is orange.

### B1. Make the redirect rule
1. dash.cloudflare.com -> **haggisgotchi.com** -> **Rules** -> **Overview**.
2. **Create rule** -> **Redirect Rule**.
3. **Rule name:** `phone to main site`
4. **When incoming requests match:** **Custom filter expression**.
   Field **Hostname**, operator **equals**, value `phone.haggisgotchi.com`.
5. **Then:** **Type** **Dynamic**. **Expression:**
   `concat("https://haggisgotchi.com", http.request.uri.path)`
6. **Status code:** **301**. Tick **Preserve query string**.
7. Click **Deploy**.

**You should see:** the rule in the list, switched on.

### B2. Test
Tell Kiro "redirect done". Kiro runs
`curl -sI https://phone.haggisgotchi.com/moira` and expects
`301` and `location: https://haggisgotchi.com/moira`.

**If Kiro still sees 200:** the `phone` DNS record is grey (DNS only). Click it,
switch it to **Proxied**, save, wait 2 minutes, and ask Kiro to check again.

### B3 (optional, later)
Once the redirect works, the old project `haggis-gotchi-phone` can be deleted.
Ask Kiro first: deleting it is permanent.
