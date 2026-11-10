import { useEffect, useState, type FormEvent } from 'react'
import { supabase, supabaseConfigured } from './lib/supabase'

type Props = {
  onAuthChange: (email: string | null) => void
  /** Prefill from claim form */
  presetEmail?: string
  /** hatch = egg ready panel; retrieve = get brood back by email */
  intent?: 'hatch' | 'retrieve'
  /** Auto-send OTP once when egg becomes ready */
  autoSend?: boolean
}

function readAuthHashError(): string | null {
  const hash = window.location.hash.replace(/^#/, '')
  if (!hash.includes('error=')) return null
  const params = new URLSearchParams(hash)
  const code = params.get('error_code') ?? ''
  const desc = params.get('error_description')?.replace(/\+/g, ' ') ?? ''
  if (code === 'otp_expired' || desc.toLowerCase().includes('expired')) {
    return 'That email link was already used or expired. Request a new code and type the 6-digit number instead.'
  }
  return desc || 'Sign-in link failed. Request a new code.'
}

function clearAuthHash() {
  if (
    window.location.hash.includes('error=') ||
    window.location.hash.includes('access_token')
  ) {
    window.history.replaceState(
      null,
      '',
      window.location.pathname + window.location.search,
    )
  }
}

export function AuthBar({
  onAuthChange,
  presetEmail = '',
  intent = 'hatch',
  autoSend = false,
}: Props) {
  const [email, setEmail] = useState(presetEmail)
  const [otp, setOtp] = useState('')
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [sessionEmail, setSessionEmail] = useState<string | null>(null)
  const [status, setStatus] = useState(() => readAuthHashError() ?? '')
  const [busy, setBusy] = useState(false)
  const [autoTried, setAutoTried] = useState(false)

  useEffect(() => {
    if (presetEmail) setEmail(presetEmail)
  }, [presetEmail])

  useEffect(() => {
    if (readAuthHashError()) clearAuthHash()
  }, [])

  useEffect(() => {
    if (!supabase) {
      onAuthChange(null)
      return
    }

    void supabase.auth.getSession().then(({ data }) => {
      const next = data.session?.user.email ?? null
      setSessionEmail(next)
      onAuthChange(next)
      if (next) clearAuthHash()
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const next = session?.user.email ?? null
      setSessionEmail(next)
      onAuthChange(next)
    })

    return () => sub.subscription.unsubscribe()
  }, [onAuthChange])

  async function sendCodeTo(address: string) {
    if (!supabase || !address.trim()) return false
    setBusy(true)
    setStatus('')
    const trimmed = address.trim()
    const { error } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: {
        emailRedirectTo: window.location.origin,
        shouldCreateUser: true,
      },
    })
    setBusy(false)
    if (error) {
      setStatus(error.message)
      return false
    }
    setSentTo(trimmed)
    setStatus(
      intent === 'retrieve'
        ? 'Code sent. Enter it below to retrieve your Haggling(s).'
        : 'Your egg is ready — we emailed a 6-digit code. Type it below (ignore the link).',
    )
    return true
  }

  useEffect(() => {
    if (!autoSend || autoTried || sessionEmail || !presetEmail || !supabase) return
    setAutoTried(true)
    void sendCodeTo(presetEmail)
  }, [autoSend, autoTried, sessionEmail, presetEmail])

  if (!supabaseConfigured || !supabase) {
    return (
      <div className="auth-bar auth-bar-brood">
        <p className="care-sub">
          Cloud off — add <code>VITE_SUPABASE_*</code> in env and redeploy.
        </p>
      </div>
    )
  }

  async function sendCode(e: FormEvent) {
    e.preventDefault()
    await sendCodeTo(email)
  }

  async function verifyCode(e: FormEvent) {
    e.preventDefault()
    if (!supabase || !sentTo || !otp.trim()) return
    setBusy(true)
    setStatus('')
    const { error } = await supabase.auth.verifyOtp({
      email: sentTo,
      token: otp.trim(),
      type: 'email',
    })
    setBusy(false)
    if (error) {
      setStatus(error.message)
      return
    }
    setOtp('')
    setStatus(
      intent === 'retrieve'
        ? 'Signed in — fetching your brood from the cloud…'
        : 'Signed in — your Haggling is linked to this email.',
    )
  }

  async function signOut() {
    if (!supabase) return
    await supabase.auth.signOut()
    setSentTo(null)
    setStatus('Signed out')
  }

  if (sessionEmail) {
    return (
      <div className="auth-bar auth-bar-in auth-bar-brood">
        <p className="care-sub">
          Linked as <strong>{sessionEmail}</strong>
          {intent === 'retrieve' ? ' — brood syncing.' : ' — ready to hatch & care.'}
        </p>
        <button type="button" className="btn btn-ghost" onClick={() => void signOut()}>
          Sign out
        </button>
      </div>
    )
  }

  return (
    <div className="auth-bar auth-bar-brood">
      <p className="signup-kicker">
        {intent === 'retrieve' ? 'Retrieve my Haggling' : 'Egg ready — prove it’s you'}
      </p>
      <p className="care-sub">
        {intent === 'retrieve'
          ? 'Enter the email you used when claiming. We’ll send a 6-digit code — no password.'
          : `We’ll email a 6-digit code to ${presetEmail || 'your claim email'}. Same address unlocks phone care later.`}
      </p>

      <form className="auth-stack" onSubmit={(e) => void sendCode(e)}>
        <div className="auth-row">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@email.com"
            autoComplete="email"
            required
            readOnly={Boolean(presetEmail) && intent === 'hatch'}
          />
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy && !sentTo ? 'Sending…' : sentTo ? 'Resend code' : 'Send code'}
          </button>
        </div>
      </form>

      {sentTo ? (
        <form className="auth-stack" onSubmit={(e) => void verifyCode(e)}>
          <label className="field">
            <span>6-digit code from email</span>
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="123456"
              required
            />
          </label>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? 'Checking…' : 'Verify'}
          </button>
        </form>
      ) : null}

      {status ? <p className="care-sub">{status}</p> : null}
    </div>
  )
}
