/**
 * Send a web push notification. Spec: .kiro/specs/care-reminders
 * Secrets: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT.
 */
import webpush from 'npm:web-push@3.6.7'

export type PushSub = { endpoint: string; p256dh: string; auth: string }
export type PushOutcome = 'sent' | 'gone' | 'failed'

let configured = false

export function configurePush(): string[] {
  const pub = Deno.env.get('VAPID_PUBLIC_KEY')
  const priv = Deno.env.get('VAPID_PRIVATE_KEY')
  const subject = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:hello@haggisgotchi.com'
  const missing = [!pub && 'VAPID_PUBLIC_KEY', !priv && 'VAPID_PRIVATE_KEY'].filter(Boolean) as string[]
  if (missing.length) return missing
  if (!configured) {
    webpush.setVapidDetails(subject, pub!, priv!)
    configured = true
  }
  return []
}

export async function sendPush(
  sub: PushSub,
  payload: { title: string; body: string; url?: string; tag?: string },
): Promise<PushOutcome> {
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload),
      { TTL: 60 * 60 },
    )
    return 'sent'
  } catch (err) {
    const status = (err as { statusCode?: number }).statusCode
    if (status === 404 || status === 410) return 'gone'
    console.error('push failed', status ?? (err instanceof Error ? err.message : err))
    return 'failed'
  }
}
