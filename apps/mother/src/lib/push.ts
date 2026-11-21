/**
 * Care reminders: web push subscription. Spec: care-reminders R1, R5, R8.
 * The VAPID PUBLIC key is public by design. The private half is only in Supabase secrets.
 */
import { deviceTimezone } from './device'
import { supabase } from './supabase'

export const VAPID_PUBLIC_KEY =
  'BL2-IzzqQRv2K4tIBPYcW7eDOsqeNzQqh-Pd5qir3ySnJM9pLJ-dYCik1vtzEoduCjfc49thDI9JpATVfTPp3JM'

export function pushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

export async function registerServiceWorker(): Promise<void> {
  if (!('serviceWorker' in navigator)) return
  try {
    await navigator.serviceWorker.register('/sw.js')
  } catch (err) {
    console.error('service worker', err)
  }
}

function keyBytes(base64Url: string): Uint8Array<ArrayBuffer> {
  const pad = '='.repeat((4 - (base64Url.length % 4)) % 4)
  const raw = atob((base64Url + pad).replace(/-/g, '+').replace(/_/g, '/'))
  const out = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

export type ReminderState = 'unsupported' | 'blocked' | 'off' | 'on'

export async function reminderState(): Promise<ReminderState> {
  if (!pushSupported()) return 'unsupported'
  if (Notification.permission === 'denied') return 'blocked'
  const reg = await navigator.serviceWorker.getRegistration()
  const sub = await reg?.pushManager.getSubscription()
  return sub ? 'on' : 'off'
}

/** Ask permission (only when the carer presses the button), subscribe, save on the server. */
export async function enableReminders(): Promise<{ ok: boolean; error?: string }> {
  if (!pushSupported() || !supabase) return { ok: false, error: 'This browser cannot show reminders.' }
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    return { ok: false, error: 'Reminders are blocked. Allow notifications for Haggis-gotchi in your phone settings.' }
  }
  await registerServiceWorker()
  const reg = await navigator.serviceWorker.ready
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(VAPID_PUBLIC_KEY) }))
  const json = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } }
  const { data, error } = await supabase.rpc('save_push_subscription', {
    p_endpoint: json.endpoint ?? '',
    p_p256dh: json.keys?.p256dh ?? '',
    p_auth: json.keys?.auth ?? '',
    p_timezone: deviceTimezone(),
  })
  if (error || data !== true) {
    if (error) console.error('save_push_subscription', error.message)
    return { ok: false, error: 'Could not save reminders. Check you are signed in, then try again.' }
  }
  return { ok: true }
}

export async function disableReminders(): Promise<void> {
  const reg = await navigator.serviceWorker.getRegistration()
  const sub = await reg?.pushManager.getSubscription()
  if (!sub) return
  if (supabase) await supabase.rpc('delete_push_subscription', { p_endpoint: sub.endpoint })
  await sub.unsubscribe()
}
/** Quiet nights (owner tick box, 22 Nov): no reminders 22:00-07:00 local time, at most 6 a day. */
export async function fetchQuietHours(): Promise<boolean | null> {
  if (!supabase) return null
  const { data, error } = await supabase.from('push_subscriptions').select('quiet_hours').limit(1)
  if (error || !data?.length) return null
  return data[0].quiet_hours === true
}
export async function saveQuietHours(on: boolean): Promise<boolean> {
  if (!supabase) return false
  const { data, error } = await supabase.rpc('set_quiet_hours', { p_on: on })
  if (error) console.error('set_quiet_hours', error.message)
  return data === true
}
