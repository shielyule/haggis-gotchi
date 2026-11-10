import { useEffect, useState } from 'react'
import { carePortraitFor, temperamentForChaos } from './data/temperaments'
import { careAlertFor, healthLabel } from './lib/health'
import { ensureNotifyPermission } from './lib/notifications'
import {
  formatClockHour,
  moodLabel,
  tickHaggling,
  type CareAction,
  type EggRecord,
} from './lib/storage'
import {
  careActionSynced,
  mintPhoneTransferSynced,
  nameHagglingSynced,
} from './lib/syncActions'
import { WatchMemories } from './WatchMemories'

type Props = {
  egg: EggRecord
  onChange: () => void
  onBack: () => void
}

const ACTIONS: { id: CareAction; label: string; hint: string }[] = [
  { id: 'feed', label: 'Feed', hint: 'Best at breakfast or dinner' },
  { id: 'cuddle', label: 'Cuddle', hint: 'Calms any temperament' },
  { id: 'walk', label: 'Walk', hint: 'Hills in the imagination' },
  { id: 'treat', label: 'Treat', hint: 'Irn-Bru energy, briefly' },
  { id: 'clean', label: 'Clean up', hint: 'The mess will not clean itself' },
]

/** 24 hour options labelled as 12-hour clock. */
const HOUR_OPTIONS = Array.from({ length: 24 }, (_, hour) => ({
  hour,
  label: formatClockHour(hour),
}))

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

export function CareScreen({ egg, onChange, onBack }: Props) {
  const [now, setNow] = useState(() => Date.now())
  const [transfer, setTransfer] = useState<{
    code: string
    link: string
  } | null>(null)
  const [copied, setCopied] = useState<'link' | 'code' | null>(null)
  const [shareNote, setShareNote] = useState('')
  const h = egg.haggling
  const temp = temperamentForChaos(egg.answers.chaos)
  const onPhone = h?.livingOn === 'phone'

  useEffect(() => {
    void ensureNotifyPermission()
  }, [])

  useEffect(() => {
    if (onPhone) return
    tickHaggling(egg.id)
    onChange()
    const t = window.setInterval(() => {
      setNow(Date.now())
      tickHaggling(egg.id)
      onChange()
    }, 30_000)
    return () => window.clearInterval(t)
  }, [egg.id, onPhone])

  if (!h) return null

  const breakfastHour = h.breakfastHour ?? h.feedHour ?? 8
  const dinnerHour = h.dinnerHour ?? 18
  const alert = careAlertFor(h)
  const healthXp = typeof h.healthXp === 'number' ? h.healthXp : 50

  function act(action: CareAction) {
    if (onPhone) return
    void careActionSynced(egg.id, action, 'mother').then(() => onChange())
  }

  function flashCopied(kind: 'link' | 'code') {
    setCopied(kind)
    window.setTimeout(() => setCopied(null), 2000)
  }

  function sendToPhone() {
    void mintPhoneTransferSynced(egg.id).then((minted) => {
      if (!minted) return
      const phoneOrigin =
        import.meta.env.VITE_PHONE_ORIGIN ?? 'http://localhost:5174'
      const link = `${phoneOrigin}/#/c/${minted.token}`
      setTransfer({ code: minted.code, link })
      onChange()
      void navigator.clipboard?.writeText(link).then(() => flashCopied('link'))
    })
  }

  async function copyTransfer(kind: 'link' | 'code') {
    if (!transfer) return
    const text = kind === 'link' ? transfer.link : transfer.code
    await navigator.clipboard?.writeText(text)
    flashCopied(kind)
  }

  async function shareTransfer() {
    if (!transfer) return
    const title = `Collect ${h?.name ?? 'your Haggling'}`
    const text = `${h?.name ?? 'Your Haggling'} is ready on your phone. Open this link to collect them — same pet, not a twin.`
    try {
      if (navigator.share) {
        await navigator.share({ title, text, url: transfer.link })
        setShareNote('Shared')
      } else {
        await navigator.clipboard?.writeText(`${text}\n${transfer.link}`)
        setShareNote('Share text copied — paste into Messages / WhatsApp / email')
      }
    } catch {
      setShareNote('Share cancelled')
    }
    window.setTimeout(() => setShareNote(''), 3000)
  }

  async function shareOnSocial() {
    const name = h?.name ?? 'my Haggling'
    const portrait = `${window.location.origin}${carePortraitFor(temp.id)}`
    const text = `Meet ${name} — a ${temp.label} Haggling from Haggis-gotchi. Scottish folklore Tamagotchi energy.`
    try {
      if (navigator.share) {
        await navigator.share({ title: name, text, url: window.location.origin })
        setShareNote('Shared to your apps')
      } else {
        await navigator.clipboard?.writeText(`${text}\n${portrait}`)
        setShareNote('Caption + image link copied — paste into Instagram / X / TikTok')
      }
    } catch {
      setShareNote('Share cancelled')
    }
    window.setTimeout(() => setShareNote(''), 3500)
  }

  const hour = new Date(now).getHours()
  const breakfastSoon = nearHour(hour, breakfastHour)
  const dinnerSoon = nearHour(hour, dinnerHour)
  const bedSoon = nearHour(hour, h.bedHour)

  return (
    <div className={`care phone-shell care-alert-${alert}`}>
      <header className="care-head">
        <button type="button" className="btn btn-ghost care-back" onClick={onBack}>
          Mother
        </button>
        <div>
          <p className="signup-kicker">Your Haggling</p>
          <h2>{h.name}</h2>
          <p className="care-sub">
            {temp.label} · {moodLabel(h.mood)} · {healthLabel(h)}
            {alert === 'amber' ? ' · amber warning' : ''}
            {alert === 'red' ? ' · sick / penalty' : ''}
            {onPhone ? ' · living on phone' : ' · with mother'}
            {!onPhone && breakfastSoon ? ' · breakfast' : ''}
            {!onPhone && dinnerSoon ? ' · dinner' : ''}
            {!onPhone && bedSoon ? ' · bedtime' : ''}
          </p>
        </div>
      </header>

      <section className="care-transfer">
        {onPhone && !transfer ? (
          <p className="care-sub">
            Care lives on the phone now. Mother keeps the brood record — open the
            phone app with your claim link to look after {h.name}.
          </p>
        ) : null}
        {!onPhone || transfer ? (
          <>
            {!transfer ? (
              <button type="button" className="btn btn-primary" onClick={sendToPhone}>
                Send to phone
              </button>
            ) : null}
            {transfer ? (
              <div className="transfer-card">
                <p className="signup-kicker">Send to your phone</p>
                <p className="transfer-code">{transfer.code}</p>
                <ol className="transfer-steps">
                  <li>Copy the claim link (or share it to yourself).</li>
                  <li>On your phone, open the phone app / paste into Safari or Chrome.</li>
                  <li>
                    Same Haggling arrives — not a twin. Mother keeps the brood
                    record.
                  </li>
                </ol>
                <img
                  className="transfer-qr"
                  alt={`QR code to collect ${h.name}`}
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(transfer.link)}`}
                />
                <p className="care-sub">
                  Scan from your phone camera if the link is reachable on your
                  network. Local demo: paste the link into the phone browser on
                  this Mac first.
                </p>
                <div className="transfer-actions">
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => void copyTransfer('link')}
                  >
                    {copied === 'link' ? 'Link copied' : 'Copy link'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => void copyTransfer('code')}
                  >
                    {copied === 'code' ? 'Code copied' : 'Copy code'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => void shareTransfer()}
                  >
                    Share to phone
                  </button>
                </div>
                <a className="transfer-link" href={transfer.link}>
                  Open phone claim on this device
                </a>
              </div>
            ) : null}
          </>
        ) : null}

        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => void shareOnSocial()}
        >
          Share {h.name} on social
        </button>
        {shareNote ? <p className="care-sub">{shareNote}</p> : null}
      </section>

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
        <p className="care-sub care-sick-note">
          Health XP is {healthXp} (below zero) — {h.name} is sick until care
          recovers them.
        </p>
      ) : null}

      <p className="care-schedule">
        Breakfast <strong>{formatClockHour(breakfastHour)}</strong>
        {' · '}
        Dinner <strong>{formatClockHour(dinnerHour)}</strong>
        {' · '}
        Bed <strong>{formatClockHour(h.bedHour)}</strong>
      </p>

      {!onPhone ? (
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
      ) : null}

      <WatchMemories
        temperamentId={temp.id}
        extras={h.memoryFilms ?? []}
      />

      <section className="care-scrap">
        <h3>Scrapbook</h3>
        {h.scrapbook.length === 0 ? (
          <p className="care-sub">Nothing written yet.</p>
        ) : (
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
        )}
      </section>
    </div>
  )
}

type NameProps = {
  egg: EggRecord
  onNamed: () => void
  onBack: () => void
}

export function NameHagglingForm({ egg, onNamed, onBack }: NameProps) {
  const [name, setName] = useState('')
  const [breakfastHour, setBreakfastHour] = useState(8)
  const [dinnerHour, setDinnerHour] = useState(18)
  const [bedHour, setBedHour] = useState(20)
  const [error, setError] = useState('')
  const temp = temperamentForChaos(egg.answers.chaos)

  return (
    <form
      className="signup"
      onSubmit={(e) => {
        e.preventDefault()
        if (!name.trim()) {
          setError('Every Haggling needs a name.')
          return
        }
        void nameHagglingSynced(
          egg.id,
          name,
          breakfastHour,
          dinnerHour,
          bedHour,
        ).then(() => onNamed())
      }}
    >
      <header className="signup-head">
        <p className="signup-kicker">Name your Haggling</p>
        <h2>A {temp.label.toLowerCase()} baby needs a name</h2>
        <p>
          Set breakfast, dinner, and bedtime. Show up then and they glow. Miss
          a meal window and they get peely-wally — the scrapbook will notice.
        </p>
      </header>

      <label className="field">
        <span>Name</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Bonnie, Moss, Wee Radge"
          autoFocus
        />
      </label>

      <label className="field">
        <span>Breakfast</span>
        <select
          value={breakfastHour}
          onChange={(e) => setBreakfastHour(Number(e.target.value))}
        >
          {HOUR_OPTIONS.map((opt) => (
            <option key={opt.hour} value={opt.hour}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        <span>Dinner</span>
        <select
          value={dinnerHour}
          onChange={(e) => setDinnerHour(Number(e.target.value))}
        >
          {HOUR_OPTIONS.map((opt) => (
            <option key={opt.hour} value={opt.hour}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        <span>Bedtime</span>
        <select
          value={bedHour}
          onChange={(e) => setBedHour(Number(e.target.value))}
        >
          {HOUR_OPTIONS.map((opt) => (
            <option key={opt.hour} value={opt.hour}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>

      {error ? <p className="form-error">{error}</p> : null}

      <div className="signup-actions">
        <button type="button" className="btn btn-ghost" onClick={onBack}>
          Back
        </button>
        <button type="submit" className="btn btn-primary">
          Begin care
        </button>
      </div>
    </form>
  )
}
