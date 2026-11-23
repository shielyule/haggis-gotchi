---
inclusion: fileMatch
fileMatchPattern: [".kiro/specs/**/*.md", "packages/care-engine/**/*.ts", "supabase/functions/**/*.ts", "apps/mother/src/lib/**/*.ts"]
---
# Kiro - Property-based tests are part of every feature (owner, 23 Nov 2026)

Why: 45 properties written from our EARS requirements found 7 real bugs that example
tests missed, including bars freezing while the app was open (`docs/PBT-FINDINGS.md`).

## When writing or changing a spec
- **design.md** gets a "Correctness properties" section: for each testable requirement, one
  plain-English rule that must hold for *every* input ("For any Haggling and any sequence of care,
  Life XP never goes down"), with its requirement id (e.g. `photo-care R5.4`).
- Say which requirements are **not** testable as properties (UI wording, third-party calls) and why.
- **tasks.md** gets a task per property group: "Write property tests P? for R?", next to the build task,
  not at the end.

## When writing the tests
- Use fast-check (root `devDependencies`), `node:test`, 300 runs by default.
- Put them in the matching `properties*.test.ts` file; number them (P29, S15, A4...) and put the
  requirement id in the test name.
- Pure code only (engine, `_shared`, `lib`). Anything needing the network or a browser stays an example test.
- Never weaken a property to make it pass. If the rule is wrong, change the requirement first,
  with the date and the reason, then the property.
- A failing property found before its fix is merged: mark it `{ todo: 'finding F?' }` and record it
  in `docs/PBT-FINDINGS.md` with the shrunk counterexample and a recommended fix.

## Gate
`npm test` runs in GitHub CI and in the Cloudflare Pages build (`apps/mother` `npm run build`),
so a broken property stops a deploy.
