# Kiro - Incident: Amazon Bedrock unusable on a new AWS account (23-24 Nov 2026)

Recorded at the owner's request, for the Kiroween 2026 write-up and as feedback to the hackathon's
sponsor (AWS). Facts below come from our own logs (`public.ai_calls`), the error texts AWS returned,
and the support replies the owner received.

## Owner's view (in their words)
> "AWS is a major fail. Offering a service with zero tokens and no way to get them increased, and
> giving utterly dud advice."

## What we were trying to do
Add three AI features (spec `.kiro/specs/ai-haggling`) using **Amazon Bedrock** with **Amazon Nova Lite**
in Europe (London), in the same AWS account the game already uses for Amazon Rekognition (which works):
a nightly diary, a reaction to a photo, and a daily folklore riddle. Volume capped by the app at
400 short calls a day.

## Timeline
| When (UTC) | What happened |
|---|---|
| 23 Nov, afternoon | Kiro checks AWS docs: Nova Lite and Micro run in eu-west-2; Amazon's own models are "enabled by default". |
| 23 Nov | Owner adds `bedrock:InvokeModel` for Nova Lite and Nova Micro to the existing restricted IAM user. |
| 23 Nov 18:49 | First live calls. All fail. The game's written fallbacks take over (players see no error). |
| 23 Nov 20:17 | Calls time out (`AbortError`). Kiro finds the AWS client library was silently retrying a refusal for 20+ seconds. Kiro turns retries off and records the reason for every failed call. |
| 23 Nov 20:18 | The real reason appears: **`429 ThrottlingException: Too many tokens per day`**, on the account's first ever Bedrock call, for Nova Lite **and** Nova Micro. |
| 23 Nov | Service Quotas: "Model invocation max tokens per day for Amazon Nova Lite" (quota code `L-45E0AD92`) is **0**, marked **Not adjustable**. AWS's published default is 5,760,000,000. |
| 23 Nov | Owner contacts AWS Support. The reply (automated) advises requesting "Cross-Region InvokeModel tokens per minute for Amazon Nova Lite" instead, and running CLI commands for evidence. |
| 24 Nov | Owner tries that request. Service Quotas: **"This quota isn't adjustable and you can't request a quota increase."** |
| 24 Nov | Owner opens a support case. It goes straight to **Complete**: an AI helper replied "I'm unable to offer a recommendation ... The current support interaction has been closed." No human saw it. |
| 24 Nov 10:40 | Owner's own riddle and photo on the live game: both AI calls refused (429). Written lines used. |

## Evidence (from `public.ai_calls`, 23-24 Nov)
- **14 AI calls, 0 successful.**
- 7 recorded as `429 ThrottlingException Too many tokens per day` (after reason logging began), 2 as timeouts
  caused by the hidden retries, 5 earlier ones without a recorded reason (same period, same failure).

## What was wrong (AWS side)
1. **A zero quota on a "default enabled" model.** The account can call the model (permission works, the
   request reaches Bedrock) but is allowed zero tokens a day. The error says "too many tokens", not
   "quota is zero", so it reads like a usage problem on a first call.
2. **No self-service fix.** The quota is marked not adjustable; the alternative quota AWS Support suggested
   is also not adjustable.
3. **Support loop.** The first support reply was generic and its main suggestion was a dead end; the next
   attempt was closed automatically by an AI helper before any person saw it. The free (Basic) plan does not
   offer technical cases.
4. **Widely reported.** Many public AWS re:Post threads in 2026 describe the same: new accounts with all
   Bedrock token quotas at 0, not adjustable, support cases slow or unanswered.

## What Kiro did (our side)
- **The game never depended on the AI.** Every AI feature has a written fallback, so players saw a diary,
  reactions and riddles throughout. Nothing broke.
- **Fail fast:** retries off, timeout configurable (`AI_TIMEOUT_MS`), so a refusal costs 2 seconds, not 24.
- **Record the reason** for every failed call (`ai_calls.reason`: status and AWS error type, never content).
- **Guides for the owner:** `docs/AWS-BEDROCK-SETUP.md` (permission, quota, CloudShell) and
  `docs/AWS-QUOTA-DUMMIES.md` (plain-English support case).

## What we learned (for Kiro's own rules)
- A vendor's "enabled by default" is not proof of usable. **Make one real call early**, from the real
  account, before building on a service. Here, the permission step and the first live call came after the
  features were built; the fallbacks saved the day, but a day-one probe would have shown the zero quota sooner.
- Keep the **written fallback** rule for any third-party AI: it turned an outage into a non-event for players.

## Feedback for the hackathon (AWS is the sponsor)
For entrants on new AWS accounts, Bedrock may be unusable for the whole submission window: zero daily
tokens, no self-service increase, and support that closes the request automatically. A note in the
hackathon resources (or pre-seeded quotas for entrants) would save others the same lost day.

## Status
Open. Decision with the owner: keep the written lines for the submission, or switch the AI words to another
provider (needs a new key and a privacy notice change).
