# Kiro - Tasks: nest-and-ready

## Built before Kiro (see docs/PROVENANCE.md)
- [x] R1.1-1.2 mother has no care screen; brood opens nest in new tab
- [x] R2.1 slug from name (`lib/slug.ts`)
- [x] R3.1-3.2 ready email via cron; OTP sign-in on nest
- [x] R4.1 partial: QR, Copy link, Copy code, Share exist (QR via third party)
- [x] R5.1 phone claim by short code after sign-in

## Open
- [ ] T1 Reserved-slug list and `eggs.slug unique` migration + backfill (R2.2-2.3)
- [ ] T2 Slug assigned server-side in `claim-egg` (depends on security-hardening T4)
- [ ] T3 In-browser QR (`qrcode`), remove `api.qrserver.com` (R4.3)
- [ ] T4 Add WhatsApp and Messages buttons (R4.1)
- [ ] T5 Hide Twilio button behind `VITE_SMS_ENABLED`; document parked in README (R4.4)
- [ ] T6 Tests listed in design
- [ ] T7 Signed-out `/{slug}` shows no data (R2.4): manual check + test
