# Kiro - Devpost submission form crib sheet

**Deadline: 4 Dec 2026, 2:00pm PT = 10:00pm UK time.** Aim to submit by **3 Dec**.
**Checked on 22 Nov 2026** against https://kiroween.devpost.com/rules. Field names on the form
may differ slightly; the rules list what must be there.
You can save drafts on Devpost and edit until the deadline. After it, nothing can change.

## Before you open the form
- [ ] Repo **public** on GitHub (Settings -> General -> Danger zone -> Change visibility -> Public). Ask Kiro to check for secrets first.
- [ ] **MIT licence shows in the About box** on the repo page (top right). If not: About cog -> it reads `LICENSE` automatically once public.
- [ ] `/.kiro` is at the repo root and **not** in `.gitignore` (Kiro has checked: it is tracked).
- [ ] Video on YouTube, **Public** (`docs/SUBMISSION-VIDEO-CRIB.md`).
- [ ] Real Turnstile key in (`docs/OWNER-CLOUDFLARE-STEPS.md` Part A), so judges' sign-ups are protected.
- [ ] A judge test path written (below).

## Fields, and what to put in them

| Field | What to put | Where it comes from |
|---|---|---|
| Project name | Haggis-gotchi | |
| Tagline | A Scottish folklore pet that lives on your phone and feels your weather | |
| App URL | https://haggisgotchi.com | |
| Video | Your YouTube link | |
| GitHub repo | https://github.com/shielyule/haggis-gotchi | must be public |
| Category | **Frankenstein** (mother page + phone + server engine stitched into one pet) | `KIRO-KICKOFF.md` |
| Bonus prizes | Tick the ones you enter (below) | |
| Built with | Kiro IDE, React, TypeScript, Vite, Supabase (Postgres, Edge Functions, pg_cron), Cloudflare Pages + Turnstile, Amazon Rekognition, Open-Meteo, Web Push, MCP | |
| Description | "What it does / who it's for / how it works" (Kiro drafts from `docs/`) | Kiro writes, you edit |
| How Kiro was used | The long write-up (below) | Kiro drafts, you edit |
| Testing instructions (judges only) | Below | |

## Testing instructions for judges (paste and edit)
> Open https://haggisgotchi.com on an Android phone (Chrome). Add to home screen, open from the icon.
> Sign in with any email (one code). To skip the waits, open https://haggisgotchi.com/?demo=1&new=1
> and tick "Demo wait". On a demo egg, tap the Haggling's name 5 times for the demo menu
> (+1 day, Next stage, Skip to the end, any weather). On a computer, https://haggisgotchi.com/mother
> shows the mother page, the public scrapbook and the graveyard; /haggis-graveyard is the painted kirkyard.
> Photo Treat recognises shortbread, tablet, heather, tartan, bagpipes and Irn-Bru.

## The "How Kiro was used" write-up
The rules ask about each Kiro feature. Kiro will draft it; these are the true facts to use.

| Feature | What we did | Evidence in the repo |
|---|---|---|
| Spec-driven development | 15 specs: requirements -> design -> tasks, commits name the task | `.kiro/specs/` |
| Steering | product, tech, Scottish folklore tone, security, **owner-instructions** (written after a real incident) | `.kiro/steering/`, `docs/INCIDENT-2026-11-16-cron-setup.md` |
| Hooks | secret-guard (blocks key-shaped strings), domain-language guard, schema-regen reminder | `.kiro/hooks/` |
| MCP | Our own `haggis-weather` MCP server (weather -> temperament reaction); AWS documentation MCP for Rekognition | `.kiro/settings/mcp.json`, `tools/weather-mcp/` |
| Kiro IDE vs others | IDE for building; a second Kiro session in a git worktree built the 3D graveyard in parallel | `docs/GRAVEYARD-3D-HANDOFF.md` |
| Testing | 161 tests (incl. 45 property-based) on a shared care engine used by phone and server; DB tests in rolled-back transactions; CI on GitHub | `packages/care-engine/test/`, `supabase/tests/`, `.github/workflows/ci.yml` |
| Property-based testing | 45 fast-check properties written from the EARS requirements; 7 found real bugs (biggest: bars froze while the app was open) | `docs/PBT-FINDINGS.md`, `*/properties*.test.ts` |
| Custom agents, Powers, Crew | Not used so far. Say so honestly, or try one before the deadline | |
| Vibe vs spec | The phone-first pivot and the incident record show where spec helped and where it did not | `docs/PIVOT-2026-11-17-phone-first.md` |

## Bonus prizes you could enter
| Bonus | What it needs | Worth it? |
|---|---|---|
| **Best Demo** ($1,000) | Nothing extra: scored on Presentation | Automatic |
| **Bonus Blog** (2,000 credits, top 100) | Public blog post about Kiro + the build, on a third-party site (Medium, dev.to, LinkedIn article), **must say it was written for the Kiroween 2026 hackathon**, published before 4 Dec. URL on the form | Yes, Kiro can draft it |
| **Social Blitz** (3-month Kiro Pro+, 5 winners) | A public post that **starts with `#KiroweenHackathon26`**, your favourite thing about Kiro and how it changed how you build. Judged on original thoughts (not AI writing). URL on the form | Yes, but write it in your own words |
| Ghost of Kiroween Past | You registered for Kiroween 2025 | Only if you did |
| Best Startup / Student / Kiro Crew App | Founder details / student details / a Crew app | Probably not |

`IDEA.md` says keep the idea private until submission: post the social and blog **on submission day**.

## Final check (submission day)
1. Open the repo in a private browser window: it loads, licence shows, `.kiro` folder visible.
2. Open the YouTube link in a private window: plays, under 3:00.
3. Open haggisgotchi.com on a phone you have not used: sign-up works end to end.
4. Click **Submit** on Devpost. You should see "Submitted" on the project page. Screenshot it.
