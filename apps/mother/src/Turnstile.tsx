import { useEffect, useRef } from 'react'

/**
 * Cloudflare Turnstile ("are you human?" check) for the claim form.
 * Spec: security-hardening T4. The token is checked by the claim-egg Edge Function.
 * Site key comes from VITE_TURNSTILE_SITE_KEY (test key locally; real key in Pages).
 */

type TurnstileApi = {
  render: (
    el: HTMLElement,
    opts: {
      sitekey: string
      callback: (token: string) => void
      'expired-callback'?: () => void
      'error-callback'?: () => void
      theme?: 'light' | 'dark' | 'auto'
    },
  ) => string
  reset: (id?: string) => void
  remove: (id: string) => void
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
let scriptPromise: Promise<void> | null = null

function loadScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve()
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script')
      s.src = SCRIPT_SRC
      s.async = true
      s.defer = true
      s.onload = () => resolve()
      s.onerror = () => {
        scriptPromise = null
        reject(new Error('turnstile script failed'))
      }
      document.head.appendChild(s)
    })
  }
  return scriptPromise
}

export const turnstileSiteKey = (import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined) ?? ''

type Props = {
  onToken: (token: string | null) => void
  /** Change this number to get a fresh token (tokens are single use). */
  resetKey?: number
}

export function Turnstile({ onToken, resetKey = 0 }: Props) {
  const box = useRef<HTMLDivElement>(null)
  const widgetId = useRef<string | null>(null)
  const onTokenRef = useRef(onToken)
  onTokenRef.current = onToken

  useEffect(() => {
    if (!turnstileSiteKey || !box.current) return
    let cancelled = false
    void loadScript()
      .then(() => {
        if (cancelled || !box.current || !window.turnstile) return
        widgetId.current = window.turnstile.render(box.current, {
          sitekey: turnstileSiteKey,
          theme: 'light',
          callback: (token) => onTokenRef.current(token),
          'expired-callback': () => onTokenRef.current(null),
          'error-callback': () => onTokenRef.current(null),
        })
      })
      .catch(() => onTokenRef.current(null))
    return () => {
      cancelled = true
      if (widgetId.current && window.turnstile) window.turnstile.remove(widgetId.current)
      widgetId.current = null
    }
  }, [])

  useEffect(() => {
    if (resetKey && widgetId.current && window.turnstile) {
      onTokenRef.current(null)
      window.turnstile.reset(widgetId.current)
    }
  }, [resetKey])

  if (!turnstileSiteKey) {
    return (
      <p className="care-sub">
        Bot check is not configured on this build (VITE_TURNSTILE_SITE_KEY missing).
      </p>
    )
  }
  return <div ref={box} className="turnstile-box" />
}
