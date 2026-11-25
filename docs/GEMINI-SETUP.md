# Kiro - Switching the AI words to Google Gemini (owner guide)

**Not tested by Kiro.** Kiro cannot sign in to your Google account.
**Checked on 24 Nov 2026** against Google's pages:
[Gemini API terms](https://aistudio.google.com/docs/terms) (effective 23 Mar 2026) and
[Using Gemini API keys](https://aistudio.google.com/docs/api-key).
Never paste the key into the chat.

---

## Read this first: a decision only you can make

Google's terms say two things that matter here (rephrased from the terms page):

1. **Age.** You must be 18 or over to use the Gemini API, and you must not use it in an app that is aimed at,
   or likely to be used by, **anyone under 18**.
   Haggis-gotchi said **13 and up** from 22 Nov; on 25 Nov the owner changed it to **18+** for Gemini.
2. **UK.** Apps used by people in the UK (or EEA, Switzerland) may use **only the paid Gemini service**.
   Paid means your Google Cloud project has an active billing account. You have that, so this part is fine,
   and on the paid service Google does **not** use our prompts or replies to improve its products (it keeps
   them for a short time only to check for abuse).

So, before any setup, choose one:

| Option | What changes | Effect |
|---|---|---|
| **A. Make Haggis-gotchi 18+** | Sign-up box says "I am 18 or older"; terms and privacy say 18+ | Gemini allowed (paid). Younger players can no longer sign up. |
| **B. Keep 13+, keep the written lines** | Nothing | No AI words. Everything already works (diary, reactions, 22 riddles). |
| **C. Keep 13+, try a different AI company** | Kiro checks that company's terms for 13-17 users first | Unknown until checked. |

**Decided 25 Nov: option A.** Haggis-gotchi is now 18+ (sign-up box, terms, privacy notice: done and live).
**Done 25 Nov:** key added, budget set, first real call worked (about 1 second), all three features switched to Gemini.

---

## Your part (option A only), about 10 minutes

### Pre-flight
- You can sign in to **aistudio.google.com** with the Google account that has your billing.
- You know which **Google Cloud project** has billing switched on (or you are happy for AI Studio to make one).

### Step 1 - Open the key page
1. Go to **https://aistudio.google.com/apikey** and sign in.
2. If asked, accept the Terms of Service.

**You should see:** a page listing API keys (it may be empty) and a **Create API key** button.

### Step 2 - Use a project that has billing (paid service)
1. Left menu: **Dashboard** -> **Projects**.
2. If your billing project is not listed: **Import projects** -> search for it -> **Import**.
3. Next to the project, check it says **Paid** (or shows a billing tier). If it says **Free** or
   **Set up billing**: click it and link your billing account.

**You should see:** your project marked as paid.
**If you cannot link billing:** stop and tell Kiro what the screen says.

### Step 3 - Make the key
1. **API Keys** page -> **Create API key** -> choose the **paid project** from Step 2.
2. A key appears (a long line of letters and numbers). Click **Copy**.
   Google now makes these as "authorization" keys, locked to the Gemini API, which is what we want.

**If the button is greyed out with "You do not have permission":** stop and tell Kiro.

### Step 4 - Put the key in Supabase (not in chat)
1. Go to **supabase.com/dashboard** -> project **haggis-gotchi** -> **Edge Functions** -> **Secrets**.
2. **Add new secret.** Name: `GEMINI_API_KEY`. Value: paste the key. **Save**.

**You should see:** `GEMINI_API_KEY` in the list (the value stays hidden).

### Step 5 - A spending alarm (2 minutes)
1. Go to **console.cloud.google.com/billing** -> your billing account -> **Budgets & alerts** -> **Create budget**.
2. Name `haggis-gemini`, the paid project only, amount **£5** a month, alerts at 50%, 90%, 100%. **Finish**.

The game caps itself at 400 short AI calls a day, so normal use costs pennies.

### Step 6 - Tell Kiro "Gemini key added"

---

## Kiro's part (after option A and your steps)

1. **One real test call first** (the lesson from `docs/INCIDENT-2026-11-23-aws-bedrock-quota.md`): one diary line
   from the live server with your key. If it fails, Kiro stops and tells you why, before building anything.
2. **Switch the three features** (diary, photo reaction, riddle) from Bedrock to Gemini, about an hour:
   - same rules: no personal data in prompts, every line checked, **written lines stay as the fallback**,
     daily cap, failure reasons recorded;
   - Gemini's own safety filters on top of ours;
   - property tests still pass; one live test of each feature with a throwaway account, then deleted.
3. **Privacy notice and terms:** name Google Gemini (paid), say what it receives (the same game facts as
   before), and change the age to **18+** everywhere: sign-up box, terms, privacy notice, the Devpost answers.
4. **Update the spec** (`.kiro/specs/ai-haggling`): provider, age rule, and the date and reason.

## Turning it off
Kiro can switch the AI off at any time (`AI_OFF=1`): the game goes straight back to the written lines.
To remove the key completely, delete `GEMINI_API_KEY` in Supabase and delete the key in AI Studio.
