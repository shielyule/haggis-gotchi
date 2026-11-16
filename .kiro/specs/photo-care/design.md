# Kiro - Design: photo-care

## Flow

```
Phone / nest (signed in)
  1 pick photo -> shrink on device (canvas, JPEG, <= 1280 px, < 1 MB)
  2 POST to Edge Function photo-care  (user JWT + child id + image bytes)
Edge Function photo-care
  3 check JWT, carer owns child, child lives on this surface, daily cap (photo_checks)
  4 check file signature + size
  5 Rekognition DetectLabels + DetectText (parallel), image bytes only, nothing stored
  6 if a person/face label is present -> refuse (R6.3)
  7 match against CARE_ITEMS (pure function, unit-tested)
  8 if matched and not rewarded today: apply reward via care engine rules, write scrapbook line,
    record photo_checks row (item, confidence, no image)
  9 return { seen: [{item, confidence}], rewarded: item | null, line }
Surface
 10 show result, merge returned Haggling (sync-conflict merge rules)
```

The reward is applied on the server, so the server must run the shared care engine
(`packages/care-engine`, pure TypeScript, runs in Deno). This is the first server-side
use of the engine and proves the "one engine everywhere" design.

## Matching (pure, `supabase/functions/_shared/photoMatch.ts`)

```ts
type Detected = { labels: {name: string, confidence: number}[], words: {text: string, confidence: number}[] }
matchCareItem(detected, thresholds) -> { item: CareItemId, confidence } | null
```
- Text rule (Irn-Bru): join WORD detections, uppercase, strip punctuation; match `IRN ?BRU`. Confidence = min of the words.
- Object rules: each item lists accepted Rekognition label names (e.g. sheep: `Sheep`, `Lamb`; tartan: `Plaid`, `Tartan`). **Exact label names are taken from real test photos in T2, not guessed.**
- Best match = highest confidence among items above threshold.

## AWS setup (owner, in T1 crib sheet)
- Region: **eu-west-2 (London)** if Rekognition is available there, else eu-west-1 (Ireland). Confirm in T1.
- IAM user `haggis-photo-care`, inline policy allowing only `rekognition:DetectLabels` and `rekognition:DetectText`, resource `*` (these actions do not support resource scoping).
- Access key stored as Supabase secrets `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`.
- AWS Budgets alarm at a low monthly amount (proposal: $5) emailing the owner.
- Calls signed with AWS Signature V4 from the Edge Function (AWS SDK for JavaScript v3 Rekognition client via npm specifier, or a small SigV4 signer; choose in T3 after a Deno compatibility check).

## Data
Migration (full timestamp version, grants + RLS together):
- `photo_checks(id, carer_id, child_id, day date, item text null, confidence numeric null, at timestamptz)`; RLS select own; insert by service role only; unique `(child_id, day, item)` where item is not null (once per item per day).
- No image column anywhere.

## Cost
- Two Rekognition calls per photo, about $0.001 each (checked 16 Nov 2026, current AWS pricing pages and guides): about $0.002 per photo.
- Cap 10 photos per carer per day. 100 active carers at the cap: about $2 a day. Budget alarm catches surprises.
- Edge Function invocations fall within the Supabase plan.

## Kiro tooling (judging: variety of Kiro features)
- **AWS MCP (dev-time):** the AWS Labs MCP servers (documentation; optionally an API/CLI server with the read-only test profile) let Kiro check Rekognition docs and run test detections while writing T2 fixtures. Configured in `.kiro/settings/mcp.json`. Not used by the running app. Exact server names confirmed in T1.
- **Hook:** extend `secret-guard` to block `AKIA...` access key ids.
- **Steering:** add care items and their voice lines to `scottish-folklore.md`.

## UI
- Button "Show {name} something" under care actions on phone and nest (hidden while read-only on the nest).
- First-use notice (R6.2) with "OK" stored per device.
- Result card: what was seen with confidence, the reward, the Haggling line. Uses existing Highlands styling.

## Tests
- `photoMatch` table tests from real Rekognition responses (fixtures captured in T2): Irn-Bru can, tartan scarf, sheep, chips, a person (refused), a blank wall (no match), Irn-Bru at 85% text confidence (below 90%: no match).
- Edge Function: not owner 403, read-only surface 409, over cap 429, oversize 413, wrong file type 415, second Irn-Bru same day gives no reward.
- Engine: reward clamped; never touches lifespan.
