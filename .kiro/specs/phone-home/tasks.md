# Kiro - Tasks: phone-home

Commit format: `phone-home T2: <what>`.

- [~] T1 Migration: `home_device_id`, `set_home_device` RPC, grants, trigger update; SQL test in rollback — applied live 17 Nov, 13 SQL checks pass in rollback
- [~] T2 Device id helper; cloud mapping of `home_device_id` — built
- [~] T3 Manifest, icons, service worker registration, `InstallStep` — built (manifest, icons, sw.js, InstallStep)
- [~] T4 Phone-first routing in `App`; sign-in before claim; claim-egg called with the user token — built (PhoneApp; claim-egg gets the user token)
- [~] T5 Nest: home device set at naming; watching card + Move here; poll — built (set_home_device at naming; watching card; 60 s poll)
- [~] T6 Retire Send-to-phone UI; desktop QR to the phone — built (desktop QR; send-to-phone UI removed)
- [ ] T7 Android test (owner) following `docs/TEST-ANDROID.md`

Legend: [x] verified on a phone, [~] built and server-tested, phone test pending, [ ] not started.
