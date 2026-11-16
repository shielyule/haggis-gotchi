# Kiro - Design: nest-and-ready

## Routes
```
haggisgotchi.com/            MotherApp: hero, brood, retrieve        (App.tsx)
haggisgotchi.com/{slug}      NestApp: waiting | name | care          (NestApp.tsx, readNestSlugFromPath)
phone.haggisgotchi.com/      phone: claim, care                      (apps/phone)
```
Cloudflare Pages `_redirects` sends all paths to `index.html`.

## Slug rules (server side)
- `claim-egg` (security-hardening) computes the final slug: `safeSlug(name)`, reserved-word check, then `select 1 from eggs where answers->>'slug' = $1 and (carer_id is distinct from $carer or ...)`; on conflict append `-` + 2 random base36 chars.
- Add `eggs.slug text unique` (migration) so uniqueness is a database fact; backfill from `answers->>'slug'`.
- Client `eggSlug()` reads `eggs.slug` when present.

## Hand-off UI (CareScreen)
Replace `api.qrserver.com` with an in-browser QR renderer (`qrcode` npm package, dynamic import, canvas/SVG). Buttons:

| Button | Implementation | Cost |
| --- | --- | --- |
| QR | `qrcode` -> SVG of `phone.../#/c/CODE` | 0 |
| Copy link / code | `navigator.clipboard` | 0 |
| Share | `navigator.share` when available | 0 |
| WhatsApp | `window.open('https://wa.me/?text=' + encodeURIComponent(msg))` | 0 |
| Messages | `location.href = 'sms:?&body=' + encodeURIComponent(msg)` | 0 (user's carrier) |
| Text the claim link (Twilio) | hidden unless `VITE_SMS_ENABLED` | parked |

`msg` contains only the short link and the Haggling's name. No email or personal answers.

## Ready email
Content and safety rules: `security-hardening` design 2. Link target: `https://haggisgotchi.com/{slug}`.

## Tests
- slug: reserved, collision, unicode name, empty name, 40+ chars.
- QR: renders offline (no network request to third parties; assert via CSP and a network mock).
- hand-off: wa.me and sms strings are encoded and contain no email.
