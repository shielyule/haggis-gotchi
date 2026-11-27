# Kiro - Incident: Amazon Bedrock unusable on a new AWS account (23-24 Nov 2026)

Recorded at the owner's request, for the Kiroween 2026 write-up and as feedback to the hackathon's
sponsor (AWS). Facts below come from our own logs (`public.ai_calls`), the error texts AWS returned,
and the support replies the owner received.

## Owner's view (in their words)
> "AWS is a major fail. Offering a service with zero tokens and no way to get them increased, and
> giving utterly dud advice."

> (25 Nov, on AWS's "we'll get back to you") "They acknowledge the hackathon and do not offer a
> solution. Getting back to me is not acceptable in this age when AI is making the majority of
> decisions. Big time FAIL for AWS and it needs flagged."

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
| 24 Nov | Owner opens a case through Account and billing; it reaches a person. |
| 24 Nov 13:56 | **AWS declines** (first reply). Billing and Accounts team, after asking the Bedrock service team: the account is "relatively new (created on November 2 2026) and the overall usage is limited", so they "couldn't approve and process this limit increase request". Advice: build usage history by using "about 90%" of the existing limit, wait for the next billing cycle and ask again, or contact AWS Sales. |
| 25 Nov | **Second AWS reply** (a different support agent): acknowledges the Kiroween 2026 hackathon, that the quota "can't be increased directly", and that "your hackathon deadline makes this time-sensitive". Says the Nova Lite and Nova Micro request "is being reviewed. This may take some time." No date, no workaround, "no action is needed from you". |
| 25 Nov | Owner decides not to wait: the AI words move to Google Gemini (paid), and Haggis-gotchi becomes 18+ (Gemini's terms). |
| 27 Nov | **Third AWS reply: declined after review.** Quotas "might be updated depending on regional factors, payment history, your past Bedrock usage, and surge in demand"; "utilize your current limits and build usage and spending history", and ask again "after the next billing cycle". The current Bedrock limit is 0, so the only way to build history is spending on *other* AWS services. |

## Why AWS's advice cannot work here
- "Use about 90% of your existing limit": the existing limit is **0 tokens a day**. 90% of 0 is 0; there is
  no usage to build.
- "Wait for the next billing cycle": that is 1 December, three days before the submission deadline, with no
  promise of a different answer.
- "Contact Sales for an Account Manager": a sales route for a hobby game capped at 400 short calls a day.
So for a new account, AWS's own published default (5,760,000,000 tokens a day for Nova Lite) is shown in the
docs, the console says the model is enabled, and there is no route to a single usable token within the
hackathon window.

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
For entrants on new AWS accounts, Bedrock may be unusable for the whole submission window:
- zero daily tokens on a model the console calls enabled, marked not adjustable;
- the first support reply declined because the account was new, and advised using "90%" of a zero limit;
- the second reply acknowledged the hackathon and the deadline, then offered only "being reviewed. This may
  take some time": no date, no workaround;
- meanwhile the same account's Amazon Rekognition worked first time.
Two days of an 11-day window went on this. Suggestions: pre-seed Bedrock quotas for registered entrants,
put a warning in the hackathon resources, or give support a fast route for hackathon accounts.

## Owner's conclusion (27 Nov 2026, in their words)
> "We have moved over to Google and adapted the game to fit that platform. I was never an AWS fan, so I'm happy
> not to use them in future projects. I would like it recorded that we have had these issues with Bedrock and AWS
> in general: they do not communicate that these services are in effect unavailable to existing paid customers who
> have a history of use. Google doesn't have these limits, which is why I love using the GCP products."

**The facts behind it, from this record:**
- AWS's documentation and console present Amazon's own Bedrock models as enabled by default. Nothing in the setup
  path said the account's daily token quota was 0; it was only visible by searching Service Quotas, after the
  calls had failed.
- The account was already a paying AWS customer, using Amazon Rekognition for Photo Treat since 17 Nov. AWS
  judged it "relatively new" (created 2 Nov 2026) and declined three times, finally asking for spending history
  on other services before any review.
- Google Gemini (paid tier, same server, same day) worked on its first call, in about a second, with no quota
  request. Like any provider it has rate limits; none got in the way at this game's volume.
- Haggis-gotchi now uses Google Gemini for its AI words. The only AWS service still in use is Amazon Rekognition
  for photo recognition, which has worked throughout.

## Status
**Declined by AWS (27 Nov, after review).** We stopped waiting: the AI words moved to
Google Gemini (paid) on 25 Nov, and Haggis-gotchi is now 18+ because Gemini's terms require it. Gemini's first real
call worked in about 1 second, from the same Supabase server. If AWS ever grants the
quota, Bedrock can come back with one setting; the written lines stay as the fallback either way.
