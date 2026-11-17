# Kiro - Design: phone-home

## Routing (apps/mother is the single app)

```
App
 ├─ isDesktopLayout && !signed in      -> MotherApp (hero, brood, QR "Scan with your phone")
 ├─ phone, not installed, not skipped  -> InstallStep
 ├─ not signed in                      -> SignInStep (email -> one 6-digit code)
 ├─ signed in, no egg                  -> SignupForm (claim-egg with the user's token)
 └─ signed in, egg                     -> NestApp (wait / hatch film / name / care)
/{slug} links (old ready emails) land in the same flow.
```
`isDesktopLayout` = `matchMedia('(min-width: 900px) and (pointer: fine)')`.
Installed = `matchMedia('(display-mode: standalone)')`.

## Device id
`localStorage['haggis-gotchi:device']` = random UUID, created once per install.

## Server
- `children.home_device_id text` (nullable).
- RPC `set_home_device(p_child_id uuid, p_device_id text) returns boolean`: owner only, device id 8-64 chars `[A-Za-z0-9-]`. Used at naming and for "Move here".
- Protect trigger keeps `home_device_id` server-only (browser writes ignored).

## Client
- `NestApp`: after pull, compare `haggling.homeDeviceId` with local device id: equal = care; different = watching card + Move here.
- Watching devices poll `home_device_id` every 60 s while open.
- Phone-only mother home: QR uses the in-browser `qrcode` package (already installed), pointing to `https://haggisgotchi.com/`.
- `public/manifest.webmanifest`, icons 192/512 (cropped from `haggis-hero.jpg`), `theme_color` moss green.
- `InstallStep` listens for `beforeinstallprompt` (Android) and shows the iPhone guide otherwise.

## Retired
CareScreen "Send to phone" card and claim-code UI. `apps/phone` no longer deployed; phone.haggisgotchi.com should redirect to haggisgotchi.com (owner step in Cloudflare).
