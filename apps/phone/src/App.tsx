import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { AuthBar } from '../../mother/src/AuthBar'
import {
  carePortraitFor,
  temperamentForChaos,
} from '../../mother/src/data/temperaments'
import { claimChildByTransferCode } from '../../mother/src/lib/cloud'
import {
  careAlertFor,
  healthLabel,
} from '../../mother/src/lib/health'
import { ensureNotifyPermission } from '../../mother/src/lib/notifications'
import {
  claimOnPhone,
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

export default function App() {
  const [child, setChild] = useState<EggRecord | null>(
    () => loadPhoneStore().child,
  )
  const [claimInput, setClaimInput] = useState('')
  const [error, setError] = useState('')
  const [now, setNow] = useState(() => Date.now())
  const [carerEmail, setCarerEmail] = useState<string | null>(null)

  const onAuthChange = useCallback((email: string | null) => {
    setCarerEmail(email)
  }, [])

  useEffect(() => {
    const token = readClaimFromHash()
    if (!token || child) return
    const result = claimOnPhone(token)
    if (result.ok) {
      setChild(result.egg)
      window.history.replaceState(null, '', window.location.pathname)
    } else {
      setError(result.error)
    }
  }, [])

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
    const trimmed = claimInput.trim()

    // Short code → cloud claim when signed in
    if (trimmed.length <= 12 && !trimmed.includes('.') && !trimmed.includes('#')) {
      const cloud = await claimChildByTransferCode(trimmed)
      if (cloud.ok) {
        savePhoneStore({ child: cloud.egg })
        setChild(cloud.egg)
        window.history.replaceState(null, '', window.location.pathname)
        return
      }
      // Fall through to local packet / helpful error
      if (carerEmail) {
        setError(cloud.error)
        return
      }
    }

    const result = claimOnPhone(trimmed)
    if (!result.ok) {
      setError(
        carerEmail
          ? result.error
          : `${result.error} Or sign in with the same email as Mother, then enter the short code.`,
      )
      return
    }
    setChild(result.egg)
    window.history.replaceState(null, '', window.location.pathname)
  }

  if (!child?.haggling) {
    return (
      <main className="phone">
        <AuthBar onAuthChange={onAuthChange} />
        <header className="phone-hero">
          <p className="brand">Haggis-gotchi</p>
          <h1>Collect your Haggling</h1>
          <p>
            Sign in with the same email as Mother, then enter the short claim
            code — or paste the full claim link. Same creature, not a twin.
          </p>
        </header>
        <form className="claim" onSubmit={(ev) => void submitClaim(ev)}>
          <label>
            <span>Claim code or link</span>
            <textarea
              value={claimInput}
              onChange={(e) => setClaimInput(e.target.value)}
              placeholder="e.g. BRAW7K or paste full link…"
              rows={4}
            />
          </label>
          {error ? <p className="form-error">{error}</p> : null}
          <button type="submit" className="btn">
            Bring them home
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
