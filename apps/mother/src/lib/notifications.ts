/** Browser notifications (PWA phase). Native push comes later with Capacitor. */

export async function ensureNotifyPermission(): Promise<NotificationPermission> {
  if (typeof Notification === 'undefined') return 'denied'
  if (Notification.permission === 'granted') return 'granted'
  if (Notification.permission === 'denied') return 'denied'
  return Notification.requestPermission()
}

export function notifyCare(title: string, body: string, tag?: string) {
  if (typeof Notification === 'undefined') return
  if (Notification.permission !== 'granted') return
  try {
    new Notification(title, {
      body,
      tag: tag ?? 'haggis-care',
    })
  } catch {
    // Ignore — some browsers block without service worker
  }
}
