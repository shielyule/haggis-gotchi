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

## Switching it off again (any time)
Kiro can switch the AI off without touching AWS (`AI_OFF=1` in Supabase secrets): the game goes back
to the written lines straight away.
