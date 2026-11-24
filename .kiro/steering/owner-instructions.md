# Instructions for the owner (always applies)

Written after the 16 Nov 2026 cron incident (`docs/INCIDENT-2026-11-16-cron-setup.md`).
The owner is not a database or DevOps specialist. Write for that reader.

## Before writing any setup step for a hosted service (Supabase, Cloudflare, Resend)
1. Search the provider's changelog for changes in the last 6 months. Note the date checked in the guide.
2. Run what can be run from this machine first (read-only checks through the linked CLI), and ask before anything that changes the live project.
3. Write a pre-flight section: what must already exist (secret names, grants, extensions), and how to check it.

## Every step the owner must do
- One action per step. Say where to click or paste, with exact text.
- **You should see:** the exact expected result.
- **If you see something else:** the exact next step, or "stop and paste me this line".
- Mark the guide **Tested by Kiro** or **Not tested** at the top. No time estimates for untested steps.
- Never ask the owner to paste a secret into chat.

## When the owner reports a failure
- Do not guess. Ask for one specific thing (a log line or an error text), say exactly where to find it, then give one step.
- If two attempts fail, say so plainly and propose Kiro running the checks directly.

## Code that the owner will deploy
- Error logs must name the failing setting (names only, never values) from the first version.
- New tables: grants and RLS in the same migration, grant only what each role needs (Supabase default changed 30 Oct 2026).
- Order deploys so nothing breaks in between, and write the order down (e.g. new function live, then site, then revoke the old path).

## Before building on a hosted service (added 24 Nov, Bedrock incident)
- Make **one real call from the real account on day one**, before building features on it. "Enabled by
  default" in a vendor's docs is not proof the account can use it (`docs/INCIDENT-2026-11-23-aws-bedrock-quota.md`).
- Every third-party AI feature keeps a **written fallback** and records why a call failed (names only).
