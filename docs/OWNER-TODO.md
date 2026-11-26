# Kiro - Owner to-do list (ask Kiro "what's on my list?")

Kiro cannot send reminders by itself. Open this file, or ask Kiro, any time.
Last updated 22 Nov 2026.

## Today
- [x] Cloudflare A (26 Nov): real Turnstile key live; Kiro tested that fake answers are refused and nothing is saved.
- [x] Cloudflare B (26 Nov): phone.haggisgotchi.com redirects (301) to haggisgotchi.com.
- [ ] One real sign-up on your phone, to see the new "I am human" box pass.
- [ ] **Android QA** (from `docs/REVIEW-2026-11-22.md`):
  - [ ] Haggis Run: five guesses, then Done. Mood goes up, Energy down, scrapbook line.
  - [ ] Tell off with the mischief banner showing (small Mood drop) and without it (bigger drop, Health XP -3).
  - [ ] Poop icons appear as Mess rises; Clean up removes them.
  - [ ] Sounds tick box: chirps on and off.
  - [ ] Reminders on, then tick **Quiet nights**. Untick and tick again: it stays as you left it.
  - [ ] `/privacy` while signed in shows **Delete my account** (do not press it on your real account).
  - [ ] Sign-up: the 18+ box must be ticked; "six weeks" line shows; new identity wording.

## Art still to come
- [x] Old-age films: Douce, Skeigh (22 Nov), Ill-trickit, Radge (23 Nov).
- [x] Old-age films: Ree, Fair Wud, and Skeigh replaced (23 Nov). All six stages now have films for every type.
- [x] Halloween Child costumes live (15 Oct - 1 Nov). Android check: on a Child, demo menu -> Costume preview: Halloween.
- [x] All five seasons live for Child (23 Nov). Android check: demo menu -> each Costume preview. Drop them in the
  *Haggis images* folder and tell Kiro: it re-encodes and wires them into Watch again.
- [ ] (Optional) costume art if you want level unlocks built (`docs/GAME-DESIGN.md`).

## AI words (built 23 Nov)
- [x] AWS permission (23 Nov): works.
- [x] AWS Bedrock: quota 0, not adjustable, support closed automatically. Logged: `docs/INCIDENT-2026-11-23-aws-bedrock-quota.md`.
- [x] Decided (25 Nov): Gemini, and Haggis-gotchi is 18+ (live).
- [x] Gemini key and budget (25 Nov). Live and tested: diary and photo reactions now written by Gemini.
- [ ] (Optional) Rename the Supabase secret `GEMINI_API_KEY\`` to `GEMINI_API_KEY` (no backtick). Both work.
- [x] Riddles: hand-written only (25 Nov), 24 riddles, one per topic.
- [x] Book art and opening film (23 Nov): live.
- [ ] Android check: demo egg -> demo menu -> Write tonight's diary now; Folklore riddle; Photo Treat on a dog or a plant; Open the scrapbook.

## Submission (by 3 Dec, deadline 4 Dec 2:00pm PT = 10:00pm UK)
- [ ] Film phone footage: `docs/SUBMISSION-VIDEO-CRIB.md` + shot list `docs/VIDEO-SCRIPT.md`.
- [ ] Edit, upload to YouTube as **Public**.
- [ ] Kiro drafts the description and "How Kiro was used" write-up; you edit.
- [x] Property-based tests added (45; findings in `docs/PBT-FINDINGS.md`).
- [x] PBT findings F1-F7 fixed (22 Nov). Android check: leave the care screen open 10 minutes, bars should creep down.
- [ ] Make the repo public (Kiro checks for secrets first).
- [ ] Fill the Devpost form: `docs/SUBMISSION-FORM-CRIB.md`.
- [ ] On submission day: blog post + social post starting `#KiroweenHackathon26` (own words).
