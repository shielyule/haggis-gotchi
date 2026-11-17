/**
 * Device helpers. Spec: phone-home R1, R2, R4.
 * Layout and install checks are for showing the right screen only, never for security.
 */
const DEVICE_KEY = 'haggis-gotchi:device'
const SKIP_INSTALL_KEY = 'haggis-gotchi:skip-install'

/** Random id for this browser/installed app, created once. Not secret. */
export function getDeviceId(): string {
  try {
    let id = localStorage.getItem(DEVICE_KEY)
    if (!id || !/^[A-Za-z0-9-]{8,64}$/.test(id)) {
      id = crypto.randomUUID()
      localStorage.setItem(DEVICE_KEY, id)
    }
    return id
  } catch {
    return 'no-storage-device'
  }
}

/**
 * A computer (mouse or trackpad that can hover): show the mother at any window
 * width. Phones and tablets (touch) get the phone flow.
 */
export function isDesktopLayout(): boolean {
  return window.matchMedia('(hover: hover) and (pointer: fine)').matches
}

/** Opened from the home-screen icon. */
export function isInstalled(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

export function isIPhone(): boolean {
  return /iPhone|iPad|iPod/.test(navigator.userAgent)
}

export function installSkipped(): boolean {
  try {
    return localStorage.getItem(SKIP_INSTALL_KEY) === '1'
  } catch {
    return false
  }
}

export function skipInstall() {
  try {
    localStorage.setItem(SKIP_INSTALL_KEY, '1')
  } catch {
    // ignore
  }
}

/** The device's IANA timezone, e.g. "Europe/London". */
export function deviceTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/London'
  } catch {
    return 'Europe/London'
  }
}
