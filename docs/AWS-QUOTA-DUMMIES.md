# Kiro - Getting AWS to switch on the AI (plain-English guide)

**Not tested by Kiro.** Kiro cannot sign in to AWS.

## What is going on, in one paragraph
AWS lets your account use the AI, but sets a daily limit on how much, and for new accounts that limit
is sometimes **zero**. The "Request increase" form refuses to change a zero ("This quota isn't
adjustable"). So the form is a dead end. Only a **person at AWS Support** can fix it. You do that by
opening a **support case**: an email-style conversation with AWS. It is free. It can take a few days.
Lots of other people have had exactly this; it is not you.

The game works without it (written lines). This only switches on the AI-written words.

---

## Step 1 - Open the "create a case" page
1. Sign in at **console.aws.amazon.com** (the same login as before).
2. In the same browser, open this address:
   **https://support.console.aws.amazon.com/support/home#/case/create**

**You should see:** a page titled **Create case**, with a few boxes to choose from.

## Step 2 - Pick the right kind of case
You are on the free support plan, which allows **Account and billing** cases. Use that.
1. Click **Account and billing**.
2. **Service:** choose **Account**.
3. **Category:** choose **Other account issues** (or the closest thing to "other").
4. **Severity:** leave it as it is.

**If you see "Technical" greyed out or asking you to pay:** that is normal. Do not pay. Stay on
**Account and billing**.

## Step 3 - Say what you need
1. **Subject:** paste
```
Bedrock daily token quota is 0 on my new account - please apply the default
```
2. **Description:** paste this, then fill in your account number (12 digits, shown top right when you
   click your name):
```
Hello. My new account has the Amazon Bedrock quota "Model invocation max tokens per day for
Amazon Nova Lite" (quota code L-45E0AD92) set to 0 in Europe (London) eu-west-2. Every call returns
"ThrottlingException: Too many tokens per day" even though I have never used Bedrock before.

Service Quotas says this quota is not adjustable, so I cannot request an increase myself, and the
"use 90% of your quota first" rule cannot apply to a quota of 0.

Please apply the AWS default Bedrock token quotas for Amazon Nova Lite and Amazon Nova Micro in
eu-west-2 (or the EU cross-region profile). Use: a small hobby game for the Kiroween 2026 hackathon,
capped at 400 short calls a day, well under 1,000,000 tokens a day. The hackathon deadline is
4 December 2026.

Account ID: [your 12-digit number]
Thank you.
```
3. **Contact:** choose **Web** (they reply by email and on this page).
4. Click **Submit**.

**You should see:** a case number, for example "Case 1234567890". Write it down.

## Step 4 - Wait, then chase once
- Check your email once a day. AWS sometimes replies with an automatic answer first, like the one you
  had. If the reply does not say the quota has been changed, click **Reply** on the case and paste:
```
Thanks. The quota is still 0 and Service Quotas says it is not adjustable, so I cannot request it
myself. Please pass this to the Amazon Bedrock service team to apply the default quota.
```
- **When AWS says it is done:** tell Kiro **"quota done"**. Kiro tests it live and tells you if it works.

## If nothing by Friday 28 November
Tell Kiro. Then you choose one of these (Kiro explains each):
1. **Keep the written lines** for the submission. Everything still works and the video still shows the
   diary, the riddles and the photo reactions.
2. **Use another AI company.** That needs a new account, a new key, and a privacy notice change.
