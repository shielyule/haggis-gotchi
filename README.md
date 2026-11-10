# Haggis-gotchi

Scottish folklore Tamagotchi. A cloud **mother** hatches a baby **Haggling**; day-to-day care lives on the **phone**. One creature, many surfaces — never a twin.

**Live (target):** [haggisgotchi.com](https://haggisgotchi.com) · phone: [phone.haggisgotchi.com](https://phone.haggisgotchi.com)  
**Redirects:** `haggis-gotchi.com` · `haggisgotchi.co.uk` → primary  

© Shiel Yule · MIT — see [LICENSE](./LICENSE).

## Spine

Care + brood + sync.

1. Claim egg → birth wait → hatch film (six temperaments) → name + breakfast/dinner/bed  
2. Care meters + **Health XP** (amber warning → red/sick on penalties)  
3. **Send to phone** (claim code) — same Haggling  
4. Scrapbook remembers misses, care, and penalties  

Temperaments: Douce → Skeigh → Ill-trickit → Ree → Radge → Fair Wud.

## Repo layout

```
apps/mother/     # Brood / hatch / send-to-phone (Vite + React + TS)
apps/phone/      # Living care surface (Vite + React + TS)
supabase/        # schema.sql for Postgres + RLS
docs/art/        # Character reference
.kiro/           # Optional Kiroween steering/specs (not required to run)
```

## Run locally

```bash
# Terminal 1 — mother → http://localhost:5173
cd apps/mother && npm install && npm run dev

# Terminal 2 — phone → http://localhost:5174
cd apps/phone && npm install && npm run dev
```

Copy env examples:

```bash
cp apps/mother/.env.example apps/mother/.env.local
cp apps/phone/.env.example apps/phone/.env.local
```

Fill `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` (publishable/anon key only).  
Run `supabase/schema.sql` in the Supabase SQL editor once.

Flow: sign in (Brood panel, 6-digit email code) → claim → hatch → name → **Send to phone** → open phone app with code.

## Stack

| Layer | Choice |
| --- | --- |
| Frontend | Vite + React + TypeScript |
| Auth / DB | Supabase (magic link / OTP, Postgres, RLS) |
| Email | Resend SMTP → `hello@haggisgotchi.com` |
| Hosting | Cloudflare Pages (mother + phone) |
| Domains | Cloudflare DNS |

## Go live

Step-by-step (Resend DNS, SMTP, Pages, redirects):  
**`~/Desktop/Kiroween/SMTP-DUMMIES.md`**

## Product notes (not hackathon-dependent)

Built as a real product. Kiroween entry is optional; if submitting, use Kiro for a focused specs/hooks pass and keep `/.kiro` in the public repo. Pi pairing is parked — phone handoff is the living surface.

## Out of scope (for now)

Adventure maps, combat quests, leaderboards, gacha shop, dating, multi-folklore mothers, App Store wrappers (PWA first), crypto.
