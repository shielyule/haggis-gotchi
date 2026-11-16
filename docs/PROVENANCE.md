# Kiro - Provenance: what was built before Kiro, and why

This file is the honest account of how this repository was built. It exists for
Kiroween 2026 judges and for anyone reading the git history.

## Summary

| Period | Tool | What happened |
| --- | --- | --- |
| 30 Oct - 15 Nov 2026 | Cursor (Grok) | First working product: mother app, nest `/{slug}`, phone app, Supabase schema + RLS, Resend ready-email cron, six temperaments with hatch films, care loop, Health XP. Commits `6a19ca3`, `ad9da90`, `3490b94`, `61e889b`. |
| From 16 Nov 2026 | Kiro | Kiro takes ownership. Specs are reconciled to the real code, then every new feature goes spec -> design -> tasks -> code inside Kiro. |

## Why Cursor first

The hackathon credits (4,000 Kiro credits, request form on the Devpost Resources
tab) took longer to arrive than the build time available. The free Kiro tier
(50 credits) was not enough to build with. Rather than wait, the first working
version was built in Cursor so there was a product to hand over. The credits
landed on 16 Nov (bonus credits `kiroween-26`).

## What this means for the Kiro half of the judging

- The first four commits were **not** produced in Kiro. This repository does not
  claim otherwise.
- The `.kiro/specs/*` documents for `brood-sync` and `birthing-ritual` were
  written on day one (Kiro-style requirements/design/tasks) but their tasks were
  never ticked while the code was built elsewhere. On 16 Nov they were rewritten
  to describe what exists, with every task ticked or left open **only if it is
  true in the code**.
- Features built from 16 Nov onward (`weather-mood`, `lifespan-graveyard`,
  `sync-conflict`, `security-hardening`, `nest-and-ready` fixes) follow the Kiro
  spec workflow, with commits that name the spec.
- Cursor is used as an independent **QA reviewer** of Kiro's output. That is a
  deliberate second-opinion step, not a build tool, from this point on.

## How to verify

- `git log --oneline` - the four early commits are the Cursor era; later commits
  reference a spec name in the message.
- `.kiro/specs/GAP-LIST.md` - the gap analysis written at handover.
- `.kiro/specs/*/tasks.md` - each task is ticked only when verified.

## Reminder

The repository must be **public** with an open-source licence and `/.kiro` at the
root at submission time (Devpost deadline: 4 Dec 2026, 2:00pm PT). It is private
while lore is still unreleased.
