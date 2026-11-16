import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { AuthBar } from '../../mother/src/AuthBar'
import {
  carePortraitFor,
  temperamentForChaos,
} from '../../mother/src/data/temperaments'
import { claimChildByTransferCode, fetchLivingOn } from '../../mother/src/lib/cloud'
import {
  careAlertFor,
  healthLabel,
} from '../../mother/src/lib/health'
import { ensureNotifyPermission } from '../../mother/src/lib/notifications'
import {
  formatClockHour,
  loadPhoneStore,
  moodLabel,
  savePhoneStore,
  tickPhoneChild,
  type CareAction,
  type EggRecord,
} from '../../mother/src/lib/storage'
import { carePhoneActionSynced } from '../../mother/src/lib/syncActions'
import { WatchMemories } from '../../mother/src/WatchMemories'
import './App.css'

const ACTIONS: { id: CareAction; label: string; hint: string }[] = [
  { id: 'feed', label: 'Feed', hint: 'Best at breakfast or dinner' },
  { id: 'cuddle', label: 'Cuddle', hint: 'Calms any temperament' },
  { id: 'walk', label: 'Walk', hint: 'Hills in the imagination' },
  { id: 'treat', label: 'Treat', hint: 'Irn-Bru energy, briefly' },
  { id: 'clean', label: 'Clean up', hint: 'The mess will not clean itself' },
]

function Meter({ label, value }: { label: string; value: number }) {
  return (
    <div className="meter">
      <div className="meter-top">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <div className="meter-track" aria-hidden="true">
        <div className="meter-fill" style={{ width: `${value}%` }} />
      </div>
    </div>
  )
}

function nearHour(hour: number, target: number) {
  return Math.abs(hour - target) <= 1 || Math.abs(hour - target) >= 23
}

function readClaimFromHash(): string | null {
  const hash = window.location.hash.replace(/^#/, '')
  if (hash.startsWith('/c/')) return hash.slice(3)
  if (hash.startsWith('c/')) return hash.slice(2)
  return null
}

/** Claim codes are 6 letters/numbers. Tolerates spaces, dashes and lower case. */
function cleanCode(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12)
}

export default function App() {
  const [child, setChild] = useState<EggRecord | null>(
    () => loadPhoneStore().child,
  )
  const [claimInput, setClaimInput] = useState('')
  const [error, setError] = useState('')
  const [now, setNow] = useState(() => Date.now())
  const [carerEmail, setCarerEmail] = useState<string | null>(null)
  const [pendingHashClaim, setPendingHashClaim] = useState<string | null>(null)

  const onAuthChange = useCallback((email: string | null) => {
    setCarerEmail(email)
  }, [])

  // QR / link: #/c/CODE prefills the code. Nothing is claimed until you sign in.
  useEffect(() => {
    const token = readClaimFromHash()
    if (!token || child) return
    const code = cleanCode(token)
    setClaimInput(code)
    setPendingHashClaim(code)
  }, [])

  // Once signed in, claim the prefilled code automatically.
  useEffect(() => {
    if (!carerEmail || !pendingHashClaim || child) return
    let cancelled = false
    void claimChildByTransferCode(pendingHashClaim).then((cloud) => {
      if (cancelled) return
      setPendingHashClaim(null)
      if (cloud.ok) {
        savePhoneStore({ child: cloud.egg })
        setChild(cloud.egg)
        window.history.replaceState(null, '', window.location.pathname)
        return
      }
      setError(cloud.error)
    })
    return () => {
      cancelled = true
    }
  }, [carerEmail, pendingHashClaim, child])

  // If the Haggling was brought back to the nest, stop caring for it here.
  useEffect(() => {
    // fetchLivingOn reads the stored session itself (null when signed out).
    const childId = child?.haggling?.cloudChildId
    if (!childId) return
    let cancelled = false
    const check = () =>
      void fetchLivingOn(childId).then((where) => {
        if (cancelled || where !== 'mother') return
        savePhoneStore({ child: null })
        setChild(null)
        setError('Your Haggling went back to the nest. Send them again from the nest to care here.')
      })
    check()
    const t = window.setInterval(check, 60_000)
    return () => {
      cancelled = true
      window.clearInterval(t)
    }
  }, [child?.haggling?.cloudChildId])

  useEffect(() => {
    void ensureNotifyPermission()
  }, [])

  useEffect(() => {
    if (!child) return
    tickPhoneChild()
    setChild(loadPhoneStore().child)
    const t = window.setInterval(() => {
      setNow(Date.now())
      tickPhoneChild()
      setChild(loadPhoneStore().child)
    }, 30_000)
    return () => window.clearInterval(t)
  }, [child?.id])

  async function submitClaim(e: FormEvent) {
    e.preventDefault()
    setError('')
    const code = cleanCode(claimInput)
    if (code.length < 6) {
      setError('The claim code has 6 letters and numbers, e.g. BRAW7K.')
      return
    }
    if (!carerEmail) {
      setError('Sign in first (step 1), then press the button again.')
      return
    }
    const cloud = await claimChildByTransferCode(code)
    if (!cloud.ok) {
      setError(cloud.error)
      return
    }
    savePhoneStore({ child: cloud.egg })
    setChild(cloud.egg)
    window.history.replaceState(null, '', window.location.pathname)
  }

  if (!child?.haggling) {
    return (
      <main className="phone">
        <header className="phone-hero">
          <p className="brand">Haggis-gotchi</p>
          <h1>Collect your Haggling</h1>
          <p>Same creature as on your nest, not a twin. Two steps.</p>
        </header>

        <section className="claim">
          <p className="signup-kicker">Step 1 · Sign in</p>
          <p className="care-sub">
            Use the same email as your nest. We email you a 6-digit number: that
            number only signs you in.
          </p>
          <AuthBar onAuthChange={onAuthChange} intent="retrieve" />
        </section>

        <form className="claim" onSubmit={(ev) => void submitClaim(ev)}>
          <p className="signup-kicker">Step 2 · Claim code</p>
          <label>
            <span>
              {pendingHashClaim
                ? 'Filled in from your QR code. It goes through by itself once you are signed in.'
                : 'The 6 letters and numbers shown on your nest (not the email number).'}
            </span>
            <input
              value={claimInput}
              onChange={(e) => setClaimInput(e.target.value)}
              placeholder="e.g. BRAW7K"
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              maxLength={12}
            />
          </label>
          {error ? <p className="form-error">{error}</p> : null}
          <button type="submit" className="btn" disabled={!carerEmail}>
            {carerEmail ? 'Bring them home' : 'Sign in first (step 1)'}
          </button>
        </form>
      </main>
    )
  }

  const h = child.haggling
  const temp = temperamentForChaos(child.answers.chaos)
  const breakfastHour = h.breakfastHour ?? h.feedHour ?? 8
  const dinnerHour = h.dinnerHour ?? 18
  const hour = new Date(now).getHours()
  const alert = careAlertFor(h)
  const healthXp = typeof h.healthXp === 'number' ? h.healthXp : 50

  function act(action: CareAction) {
    void carePhoneActionSynced(action).then(() => {
      setChild(loadPhoneStore().child)
    })
  }

  return (
    <main className={`phone phone-care phone-alert-${alert}`}>
      <header className="care-head">
        <p className="brand">Haggis-gotchi</p>
        <h1>{h.name}</h1>
        <p className="care-sub">
          {temp.label} · {moodLabel(h.mood)} · {healthLabel(h)}
          {alert === 'amber' ? ' · amber' : ''}
          {alert === 'red' ? ' · sick' : ''}
          {carerEmail ? ' · synced' : ''}
          {nearHour(hour, breakfastHour) ? ' · breakfast' : ''}
          {nearHour(hour, dinnerHour) ? ' · dinner' : ''}
          {nearHour(hour, h.bedHour) ? ' · bedtime' : ''}
        </p>
      </header>

      <div className="care-stage">
        <img
          src={carePortraitFor(temp.id)}
          alt={`${h.name}, a ${temp.label} Haggling`}
        />
      </div>

      <div className="care-meters">
        <Meter label="Health XP" value={Math.max(0, Math.min(100, healthXp))} />
        <Meter label="Hunger" value={h.hunger} />
        <Meter label="Mood" value={h.mood} />
        <Meter label="Energy" value={h.energy} />
        <Meter label="Mess" value={h.mess} />
      </div>
      {healthXp < 0 ? (
        <p className="care-sub">
          Health XP {healthXp} — {h.name} is sick until you nurse them back.
        </p>
      ) : null}

      <p className="care-schedule">
        Breakfast <strong>{formatClockHour(breakfastHour)}</strong>
        {' · '}
        Dinner <strong>{formatClockHour(dinnerHour)}</strong>
        {' · '}
        Bed <strong>{formatClockHour(h.bedHour)}</strong>
      </p>

      <div className="care-actions">
        {ACTIONS.map((a) => (
          <button
            key={a.id}
            type="button"
            className="care-action"
            title={a.hint}
            onClick={() => act(a.id)}
          >
            <span>{a.label}</span>
            <small>{a.hint}</small>
          </button>
        ))}
      </div>

      <WatchMemories
        temperamentId={temp.id}
        extras={h.memoryFilms ?? []}
      />

      <section className="care-scrap">
        <h2>Scrapbook</h2>
        <ul>
          {h.scrapbook.slice(0, 8).map((entry) => (
            <li key={entry.id}>
              <time dateTime={entry.at}>
                {new Date(entry.at).toLocaleString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true,
                })}
              </time>
              <span>{entry.text}</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}
