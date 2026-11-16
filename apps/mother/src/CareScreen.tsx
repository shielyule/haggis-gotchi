import QRCode from 'qrcode'
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
import { sendClaimSms } from './lib/sendClaimSms'
import {
  careActionSynced,
  mintPhoneTransferSynced,
  nameHagglingSynced,
  refreshLivingOn,
  returnToNestSynced,
} from './lib/syncActions'

/** Paid SMS (Twilio) is parked: shown only if explicitly enabled (nest-and-ready R4.4). */
const SMS_ENABLED = import.meta.env.VITE_SMS_ENABLED === 'true'
const PHONE_ORIGIN = (import.meta.env.VITE_PHONE_ORIGIN as string | undefined) ?? 'https://phone.haggisgotchi.com'
const PHONE_IS_LOCAL = /localhost|127\.0\.0\.1/.test(PHONE_ORIGIN)
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
    expiresAt: string
    qr: string
  } | null>(null)
  const [transferBusy, setTransferBusy] = useState(false)
  const [transferError, setTransferError] = useState('')
  const [justMoved, setJustMoved] = useState(false)
  const [copied, setCopied] = useState<'link' | 'code' | null>(null)
  const [shareNote, setShareNote] = useState('')
  const [smsTo, setSmsTo] = useState('')
  const [smsBusy, setSmsBusy] = useState(false)
  const [smsNote, setSmsNote] = useState('')
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

  useEffect(() => {
    if (!transfer || onPhone) return
    const t = window.setInterval(() => {
      void refreshLivingOn(egg.id).then((next) => {
        if (next?.haggling?.livingOn === 'phone') {
          setTransfer(null)
          setJustMoved(true)
          onChange()
        }
      })
    }, 5000)
    return () => window.clearInterval(t)
  }, [transfer, onPhone, egg.id])

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
    setTransferError('')
    setJustMoved(false)
    setTransferBusy(true)
    void mintPhoneTransferSynced(egg.id).then(async (minted) => {
      setTransferBusy(false)
      if (!minted.ok) {
        setTransferError(minted.error)
        return
      }
      // The link carries ONLY the short code. The phone must still sign in as you.
      const link = `${PHONE_ORIGIN}/#/c/${minted.code}`
      // Drawn here in the browser: the link is never sent to a QR website.
      const qr = await QRCode.toDataURL(link, { margin: 1, width: 220 })
      setTransfer({ code: minted.code, link, expiresAt: minted.expiresAt, qr })
      onChange()
    })
  }

  function bringBack() {
    setTransferError('')
    void returnToNestSynced(egg.id).then((ok) => {
      if (!ok) {
        setTransferError('Could not bring them back. Sign in on this nest and try again.')
        return
      }
      setJustMoved(false)
      onChange()
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
    const text = `Collect ${h?.name ?? 'your Haggling'} on your phone. Sign in with your Haggis-gotchi email, then the code fills in by itself.`
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

  async function textClaimLink() {
    if (!transfer || !h) return
    setSmsNote('')
    setSmsBusy(true)
    const result = await sendClaimSms({
      to: smsTo,
      link: transfer.link,
      name: h.name,
      code: transfer.code,
    })
    setSmsBusy(false)
    if (result.ok) {
      setSmsNote(`Text sent to ${smsTo.trim()}`)
      return
    }
    setSmsNote(result.error)
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
        {onPhone ? (
          <div className="transfer-card">
            <p className="signup-kicker">Living on your phone</p>
            <p className="care-sub">
              {justMoved ? `${h.name} has arrived on your phone. ` : ''}
              Care happens on the phone now, so this nest is read-only. Mother still
              keeps the brood record.
            </p>
            <button type="button" className="btn btn-ghost" onClick={bringBack}>
              Bring {h.name} back to this nest
            </button>
          </div>
        ) : null}

        {!onPhone && !transfer ? (
          <button
            type="button"
            className="btn btn-primary"
            onClick={sendToPhone}
            disabled={transferBusy}
          >
            {transferBusy ? 'Making a code…' : 'Send to phone'}
          </button>
        ) : null}

        {transferError ? <p className="form-error">{transferError}</p> : null}

        {!onPhone && transfer ? (
          <div className="transfer-card">
            <p className="signup-kicker">Send {h.name} to your phone</p>
            <ol className="transfer-steps">
              <li>Point your phone camera at the square code below and tap the link.</li>
              <li>
                On the phone, sign in with the <strong>same email</strong>. You get a
                6-digit number by email: that number is only for signing in.
              </li>
              <li>{h.name} moves across by itself. This page then goes read-only.</li>
            </ol>
            <img
              className="transfer-qr"
              alt={`QR code to collect ${h.name}`}
              width={220}
              height={220}
              src={transfer.qr}
            />
            {PHONE_IS_LOCAL ? (
              <p className="form-error">
                Test build: this QR points at {PHONE_ORIGIN}, which a phone cannot
                open. Use the live site to test on a real phone.
              </p>
            ) : null}
            <p className="care-sub">
              No camera? Open {PHONE_ORIGIN.replace(/^https?:\/\//, '')} on the phone
              and type this claim code (letters and numbers, not the email number):
            </p>
            <p className="transfer-code">{transfer.code}</p>
            <p className="care-sub">
              Works once, only for you, until{' '}
              {new Date(transfer.expiresAt).toLocaleDateString(undefined, {
                day: 'numeric',
                month: 'short',
              })}
              . Waiting for your phone…
            </p>
            {SMS_ENABLED ? (
              <form
                className="transfer-sms"
                onSubmit={(ev) => {
                  ev.preventDefault()
                  void textClaimLink()
                }}
              >
                <label>
                  <span>Send link as a text</span>
                  <input
                    type="tel"
                    name="smsTo"
                    autoComplete="tel"
                    inputMode="tel"
                    placeholder="07… or +44…"
                    value={smsTo}
                    onChange={(e) => setSmsTo(e.target.value)}
                    required
                  />
                </label>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={smsBusy || !smsTo.trim()}
                >
                  {smsBusy ? 'Sending…' : 'Text the claim link'}
                </button>
                {smsNote ? <p className="care-sub">{smsNote}</p> : null}
              </form>
            ) : null}
            <div className="transfer-actions">
              <button type="button" className="btn btn-ghost" onClick={() => void copyTransfer('link')}>
                {copied === 'link' ? 'Link copied' : 'Copy link'}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => void copyTransfer('code')}>
                {copied === 'code' ? 'Code copied' : 'Copy code'}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => void shareTransfer()}>
                Share to phone
              </button>
            </div>
          </div>
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
