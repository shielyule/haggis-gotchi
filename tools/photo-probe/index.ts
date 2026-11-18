/**
 * DEV-ONLY: capture real Rekognition answers for test photos (photo-care T6).
 * Cron secret required. Fetches images only from Wikimedia (public, freely licensed).
 * Returns labels and words; stores nothing. Delete after fixtures are captured.
 */
import { isAuthorizedCron } from '../_shared/auth.ts'
import { matchTreat } from '../_shared/photoMatch.ts'
import { detect, rekognitionConfigured } from '../_shared/rekognition.ts'

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json(405, { error: 'POST only' })
  if (!isAuthorizedCron(req.headers.get('x-cron-secret'), Deno.env.get('CRON_SECRET'))) {
    return json(401, { error: 'Unauthorized' })
  }
  const missing = rekognitionConfigured()
  if (missing.length) return json(500, { error: `missing ${missing.join(', ')}` })
  try {
    const body = (await req.json()) as { imageUrl?: string; imageBase64?: string }
    if (body.imageBase64) {
      const raw = Uint8Array.from(atob(body.imageBase64), (c) => c.charCodeAt(0))
      if (raw.length > 5_000_000) return json(413, { error: 'image over 5 MB' })
      const detected = await detect(raw)
      return json(200, { imageUrl: 'local', match: matchTreat(detected), detected })
    }
    const url = new URL(String(body.imageUrl))
    if (url.protocol !== 'https:' || !['upload.wikimedia.org', 'thumb.wikimedia.org'].includes(url.hostname)) {
      return json(400, { error: 'only https://upload.wikimedia.org images' })
    }
    const img = await fetch(url, { headers: { 'User-Agent': 'haggis-gotchi-test/1.0 (hello@haggisgotchi.com)' } })
    if (!img.ok) return json(502, { error: `image ${img.status}` })
    const bytes = new Uint8Array(await img.arrayBuffer())
    if (bytes.length > 5_000_000) return json(413, { error: 'image over 5 MB' })
    const detected = await detect(bytes)
    return json(200, { imageUrl: url.toString(), match: matchTreat(detected), detected })
  } catch (err) {
    return json(500, { error: err instanceof Error ? err.message : String(err) })
  }
})
