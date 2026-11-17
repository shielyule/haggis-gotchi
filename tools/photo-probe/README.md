# photo-probe (dev-only, NOT deployed)

Used on 17 Nov 2026 to capture real Amazon Rekognition answers for 15 freely licensed
Wikimedia Commons photos (9 treats, 6 that must not count). Results:
`supabase/functions/_shared/fixtures/photo/rekognition-2026-11-17.json`, used by
`photoMatch.test.ts`. Deployed briefly (cron-secret protected), then deleted.

To capture more fixtures: copy back to `supabase/functions/photo-probe/`, deploy with
`--no-verify-jwt`, call it via `net.http_post` with the Vault cron secret, then delete it.
