# Kiro - AWS setup for Photo Treat recognition (photo-care T5)

**Status: NOT tested by Kiro.** Kiro cannot see your AWS console. AWS changes its
screens often: if a button or page name below does not match, **stop** and tell Kiro
what you see. Do not guess.

**Checked 17 Nov 2026:** Rekognition runs in Europe (London) `eu-west-2` (AWS endpoints
page). Image checks cost about $0.001 each; Photo Treat uses two per photo.

**What this gives Kiro:** a key that can do exactly two things, "find objects in a
photo" and "read text in a photo". It cannot see anything else in your account.
You never paste the key into chat. It goes straight into Supabase.

Do these in order. About 15 minutes.

---

## Part A - Budget alarm first ($5)

So a bug can never run up a bill without you knowing.

1. Sign in at **console.aws.amazon.com**.
2. In the top search bar type **Budgets** and open **Budgets** (under Billing and Cost Management).
3. Click **Create budget**.
4. Choose **Use a template (simplified)**, then **Monthly cost budget**.
5. Budget name: `haggis-photo-care`. Amount: `5` (USD). Email: your email.
6. Click **Create budget**.

**You should see:** `haggis-photo-care` in the budgets list.
**If the template names differ:** pick any monthly cost budget with a $5 amount and your email, or stop and tell Kiro.

---

## Part B - Switch region to London

1. Top right of the console, click the region name (for example "N. Virginia").
2. Choose **Europe (London) eu-west-2**.

**You should see:** "London" in the top right. (IAM is global, so Part C works in any region, but this avoids confusion later.)

---

## Part C - A user that can only do Photo Treat checks

1. Top search bar: type **IAM**, open **IAM**.
2. Left menu: **Users**, then **Create user**.
3. User name: `haggis-photo-care`. Leave "Provide user access to the AWS Management Console" **unticked**. Click **Next**.
4. On the permissions page choose **Attach policies directly**, but **do not tick any policy**. Click **Next**, then **Create user**.
5. Click the new user `haggis-photo-care` in the list.
6. Tab **Permissions** -> **Add permissions** -> **Create inline policy**.
7. Switch the editor to **JSON**. Delete what is there and paste exactly:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PhotoTreatOnly",
      "Effect": "Allow",
      "Action": ["rekognition:DetectLabels", "rekognition:DetectText"],
      "Resource": "*"
    }
  ]
}
```

8. Click **Next**. Policy name: `photo-treat-rekognition-only`. Click **Create policy**.

**You should see:** on the user's Permissions tab, one policy: `photo-treat-rekognition-only`.
(`"Resource": "*"` is required: these two actions cannot be limited to a resource. The two-action list is what keeps it safe.)

---

## Part D - Make the key and put it straight into Supabase

1. Still on the `haggis-photo-care` user: tab **Security credentials**.
2. Section **Access keys** -> **Create access key**.
3. Use case: **Application running outside AWS**. Tick the confirmation if asked. **Next**, then **Create access key**.
4. **Leave this page open.** It shows an **Access key ID** and a **Secret access key** (click Show). AWS shows the secret only once.
5. Open **Terminal** and paste this whole block, then press Enter:

```bash
cd /Users/shielyule/Desktop/haggis-gotchi-app
read "AK?Access key ID: "; read -s "SK?Secret access key (typing is hidden): "; echo
supabase secrets set "AWS_ACCESS_KEY_ID=$AK" "AWS_SECRET_ACCESS_KEY=$SK" AWS_REGION=eu-west-2; unset AK SK
```

6. When it asks, copy-paste the **Access key ID** and press Enter, then the **Secret access key** and press Enter. (The secret does not show while you paste. That is on purpose: it also keeps it out of your Terminal history.)

**You should see:** `Finished supabase secrets set.`
**If you see an error:** paste Kiro the error line only (never the keys).

7. Back in AWS click **Done**. Do not download or save the key anywhere else.

---

## Part E - Tell Kiro "AWS done"

Kiro then checks the secret **names** exist (never the values), captures real
Rekognition answers for test photos, builds the treat matcher, and switches Photo
Treat from "any photo counts" to real recognition (photo-care T6-T7).

## If a key ever leaks

IAM -> Users -> `haggis-photo-care` -> Security credentials -> the key -> **Deactivate**,
then **Delete**. Make a new one with Part D. The worst a leaked key can do is run
photo checks until the $5 alarm emails you.
