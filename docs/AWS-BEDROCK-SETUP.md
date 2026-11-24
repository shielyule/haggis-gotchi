# Kiro - Switch on the AI words (Amazon Bedrock) - one AWS step

**Not tested by Kiro.** Kiro cannot see your AWS console. If a button or page name does not
match, **stop** and tell Kiro what you see.
**Checked on 23 Nov 2026** (AWS docs): Amazon Nova Lite runs in Europe (London) `eu-west-2`;
Amazon's own models are switched on by default (no Marketplace subscription, no form).

**What this does:** lets the same restricted AWS user that checks Photo Treat photos also ask
Amazon Nova Lite for a few words: the nightly diary, a reaction to a photo, and the daily riddle.
It can still do nothing else in your account.

**Until you do this, the game already works:** it uses the written lines instead (tested live
23 Nov). Nothing breaks.

**Cost:** the game caps itself at 400 AI calls a day. At Nova Lite's price that is roughly
2 US cents a day at most (check https://aws.amazon.com/bedrock/pricing/). Your $5 budget alarm
from the Photo Treat setup still applies.

---

## Pre-flight
- You can sign in at **console.aws.amazon.com**.
- In **IAM -> Users** you can see the user **`haggis-photo-care`** (made for Photo Treat on 17 Nov).

## Step 1 - Add one permission
1. Top search bar: type **IAM**, open **IAM**.
2. Left menu: **Users** -> click **`haggis-photo-care`**.
3. Tab **Permissions**. Under "Permissions policies" find the inline policy you made on 17 Nov
   (it allows `rekognition:DetectLabels` and `rekognition:DetectText`). Click its name.
4. Click **Edit**, switch to **JSON**.
5. Delete everything and paste exactly this (it keeps Photo Treat and adds the AI words):
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PhotoTreatOnly",
      "Effect": "Allow",
      "Action": ["rekognition:DetectLabels", "rekognition:DetectText"],
      "Resource": "*"
    },
    {
      "Sid": "HagglingWordsOnly",
      "Effect": "Allow",
      "Action": ["bedrock:InvokeModel"],
      "Resource": [
        "arn:aws:bedrock:eu-west-2::foundation-model/amazon.nova-lite-v1:0",
        "arn:aws:bedrock:eu-west-2::foundation-model/amazon.nova-micro-v1:0"
      ]
    }
  ]
}
```
6. Click **Next**, then **Save changes**.

**You should see:** the policy summary now lists **Rekognition** and **Bedrock**.
**If AWS shows a red error about the JSON:** stop and paste Kiro the error text (not your keys).

## Step 2 - Tell Kiro
Say **"Bedrock done"**. Kiro then:
1. writes a test diary on a throwaway demo Haggling and checks it says `source: "ai"`;
2. checks the riddle and a photo reaction the same way;
3. removes the test account.

**If Kiro sees `AccessDeniedException`:** AWS can take a few minutes to apply a permission. Kiro waits
5 minutes and tries again. If it still fails, Kiro will ask you for one specific thing on one screen.

## Step 3 - Ask AWS to switch on the daily allowance (found 23 Nov)
**What Kiro found:** your permission works (AWS answers), but every call is refused with
`429 ThrottlingException: Too many tokens per day`. New AWS accounts often start with Bedrock's
daily allowance set to **0**, and only AWS Support can raise it. Many people report the same
(AWS re:Post, 2026). It is not something you did wrong.

**Not tested by Kiro** (support pages vary by account).

### 3a - Look at the number first (2 minutes)
1. Top search bar: **Service Quotas** -> open it. Top right region: **Europe (London) eu-west-2**.
2. **AWS services** -> search **Amazon Bedrock** -> open it.
3. In the quota search box type **tokens per day for Amazon Nova Lite**.

**You should see:** "Model invocation max tokens per day for Amazon Nova Lite" with an
**Applied account-level quota value** of **0** (that is the problem).
- If it has a **Request increase** button: click it, ask for **1,000,000**, submit. Skip 3b.
- If it says **Not adjustable**: do 3b.

### 3b - Open a support case (5 minutes)
1. Top right: **?** (Support) -> **Support Center** -> **Create case**.
2. Choose **Service limit increase** (or "Looking for service limit increases?" -> Create case).
   If that is not offered, choose **Account and billing** -> **Account** -> **Other account issues**.
3. Service: **Amazon Bedrock**. Region: **Europe (London)**.
4. Paste this as the description (edit the bracket):
```
New account, first Bedrock use. Every Converse call to amazon.nova-lite-v1:0 and
amazon.nova-micro-v1:0 in eu-west-2 returns 429 ThrottlingException "Too many tokens per day",
with zero prior usage. Service Quotas shows "Model invocation max tokens per day for
Amazon Nova Lite" applied value 0. Please apply the default Bedrock token quotas for
Amazon Nova Lite and Nova Micro in eu-west-2. Use: a small hobby game for the Kiroween 2026
hackathon, capped by the app at 400 short calls a day (well under 1,000,000 tokens a day).
Account ID: [your 12-digit account ID, top right of the console].
```
5. Contact: **Web**. Submit.

**You should see:** a case number. Replies come by email; reports say this can take 1-5 days.

### 3c - What AWS Support asked for (their reply, 23 Nov)
AWS suggested asking for a different quota and sending three command outputs. You can run the
commands in **CloudShell**, a command window inside the AWS console (nothing to install).

1. Console top bar: click the **CloudShell** icon (a small `>_` box), or search **CloudShell**.
   Make sure the region top right is **Europe (London)**.
2. Wait for the prompt `$`. Paste each line, press Enter, and copy what it prints into a text file:
```
aws bedrock get-foundation-model-availability --model-id amazon.nova-lite-v1:0 --region eu-west-2
aws service-quotas get-service-quota --service-code bedrock --quota-code L-45E0AD92 --region eu-west-2
aws service-quotas get-aws-default-service-quota --service-code bedrock --quota-code L-45E0AD92 --region eu-west-2
```
   **You should see:** JSON text. The second shows `"Value": 0.0`, the third a big default number.
   **If a line says "Invalid choice" or "NoSuchResourceException":** copy that message as it is; AWS
   wants to see it too.
3. **Service Quotas -> Amazon Bedrock**, region Europe (London). Search
   **Cross-Region InvokeModel tokens per minute for Amazon Nova Lite**. Click it ->
   **Request increase at account level** -> enter **8000000** -> **Request**.
4. Reply on your support case with: the error text (`ThrottlingException: Too many tokens per day`),
   the three outputs, and this:
```
Use case: a small hobby game (Haggis-gotchi) for the Kiroween 2026 hackathon. The app caps itself at
400 short calls a day (well under 1,000,000 tokens a day). Production, very low volume.
The applied quota L-45E0AD92 is 0, so the "use 90% of your quota first" rule cannot apply.
```
5. If the request is auto-declined, reply to the same case with that last sentence again and ask for it
   to go to the Bedrock team.

**Never paste your access keys** into CloudShell output you share, or into chat. The commands above
print no keys.

**If AWS grants the Cross-Region quota (not the London one):** tell Kiro. The game then has to call the
EU cross-region model (`eu.amazon.nova-lite-v1:0`), and the AWS permission needs one more line. Kiro
will give you the exact JSON.

**When AWS says it is done:** tell Kiro **"quota done"**. Kiro re-runs the live test.

**If it is not sorted by 1 Dec:** the game already works with the written lines (and the video
can show the riddle bank and written diary). Kiro can switch to a different AI provider if you want,
but that needs a new key and a privacy notice change, so ask first.

## Switching it off again (any time)
Kiro can switch the AI off without touching AWS (`AI_OFF=1` in Supabase secrets): the game goes back
to the written lines straight away.
