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
  const opts = { body, tag: tag ?? 'haggis-care', icon: '/icons/mother-192.png' }
  // Android Chrome only allows notifications through the service worker.
  void navigator.serviceWorker?.getRegistration().then((reg) => {
    if (reg) return reg.showNotification(title, opts)
    try {
      new Notification(title, opts)
    } catch {
      // ignore: browser refused
    }
  })
}
