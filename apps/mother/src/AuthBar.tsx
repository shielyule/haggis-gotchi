import { useEffect, useState, type FormEvent } from 'react'
import { supabase, supabaseConfigured } from './lib/supabase'

type Props = {
  onAuthChange: (email: string | null) => void
  compact?: boolean
}

function readAuthHashError(): string | null {
  const hash = window.location.hash.replace(/^#/, '')
  if (!hash.includes('error=')) return null
  const params = new URLSearchParams(hash)
  const code = params.get('error_code') ?? ''
  const desc = params.get('error_description')?.replace(/\+/g, ' ') ?? ''
  if (code === 'otp_expired' || desc.toLowerCase().includes('expired')) {
    return 'That email link was already used or expired (mail apps often “click” it first). Request a new code and type the 6-digit number instead.'
  }
  return desc || 'Sign-in link failed. Request a new code.'
}

function clearAuthHash() {
  if (window.location.hash.includes('error=') || window.location.hash.includes('access_token')) {
    window.history.replaceState(null, '', window.location.pathname + window.location.search)
  }
}

export function AuthBar({ onAuthChange, compact }: Props) {
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [sessionEmail, setSessionEmail] = useState<string | null>(null)
  const [status, setStatus] = useState(() => readAuthHashError() ?? '')
  const [busy, setBusy] = useState(false)

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

  if (!supabaseConfigured || !supabase) {
    return (
      <div className={`auth-bar${compact ? ' auth-bar-brood' : ''}`}>
        <p className="care-sub">
          Cloud off — add <code>VITE_SUPABASE_*</code> in <code>.env.local</code>.
        </p>
      </div>
    )
  }

  async function sendCode(e: FormEvent) {
    e.preventDefault()
    if (!supabase || !email.trim()) return
    setBusy(true)
    setStatus('')
    const trimmed = email.trim()
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
      return
    }
    setSentTo(trimmed)
    setStatus(
      'Email sent. Prefer the 6-digit code in the message — don’t rely on the link (it often expires from mail previews).',
    )
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
    setStatus('Signed in')
  }

  async function signOut() {
    if (!supabase) return
    await supabase.auth.signOut()
    setSentTo(null)
    setStatus('Signed out')
  }

  if (sessionEmail) {
    return (
      <div className={`auth-bar auth-bar-in auth-bar-brood`}>
        <p className="care-sub">
          Cloud carer: <strong>{sessionEmail}</strong>
        </p>
        <button type="button" className="btn btn-ghost" onClick={() => void signOut()}>
          Sign out
        </button>
      </div>
    )
  }

  return (
    <div className="auth-bar auth-bar-brood">
      <p className="signup-kicker">Cloud carer</p>
      <p className="care-sub">
        Same email on Mother and phone. We use a 6-digit code (more reliable than
        the magic link).
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
          />
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy && !sentTo ? 'Sending…' : 'Send code'}
          </button>
        </div>
      </form>

      {sentTo ? (
        <form className="auth-stack" onSubmit={(e) => void verifyCode(e)}>
          <label className="field">
            <span>Code from email</span>
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="6-digit code"
              required
            />
          </label>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? 'Checking…' : 'Verify & sign in'}
          </button>
        </form>
      ) : null}

      {status ? <p className="care-sub">{status}</p> : null}
    </div>
  )
}
