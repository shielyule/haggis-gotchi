import { useEffect, useRef, useState } from 'react'
import { carePortraitFor, temperamentForChaos } from './data/temperaments'
import { lifeLevel } from './lib/engine'
import { careAlertFor, healthLabel } from './lib/health'
import { getDeviceId } from './lib/device'
import {
  disableReminders,
  enableReminders,
  reminderState,
  type ReminderState,
} from './lib/push'
import {
  formatClockHour,
  moodLabel,
  tickHaggling,
  type CareAction,
  type EggRecord,
} from './lib/storage'
import {
  careActionSynced,
  moveHereSynced,
  nameHagglingSynced,
  photoTreatSynced,
  refreshHomeDevice,
} from './lib/syncActions'
import { isDemoEgg, isPlayFilmUnlocked, WEATHER_BUCKETS, WEATHER_LABEL } from './lib/engine'
import {
  applyDemoWeather,
  chooseHomePlace,
  chooseLocation,
  syncWeather,
  weatherChoice,
  type WeatherChip,
} from './lib/weather'
import { WatchMemories } from './WatchMemories'

const WEATHER_ICON: Record<string, string> = {
  sunny: '☀️', crisp: '🌤️', frost: '❄️', hot: '🥵', grey: '☁️',
  rain: '🌧️', storm: '⛈️', snow: '🌨️', windy: '🌬️', humid: '💧',
  fog: '🌫️', haar: '🌊',
}

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

/** Shrink on the device before upload (photo-care R1.3): long side <= 1280 px, JPEG. */
async function shrinkPhoto(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, 1280 / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(bitmap.width * scale))
  canvas.height = Math.max(1, Math.round(bitmap.height * scale))
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close?.()
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('encode failed'))), 'image/jpeg', 0.85),
  )
}

export function CareScreen({ egg, onChange, onBack }: Props) {
  const [now, setNow] = useState(() => Date.now())
  const [shareNote, setShareNote] = useState('')
  const [moveBusy, setMoveBusy] = useState(false)
  const [moveError, setMoveError] = useState('')
  const [reminders, setReminders] = useState<ReminderState>('off')
  const [reminderNote, setReminderNote] = useState('')
  const [treatBusy, setTreatBusy] = useState(false)
  const [treatNote, setTreatNote] = useState<{ text: string; good: boolean } | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const [choice, setChoice] = useState(() => weatherChoice())
  const [chip, setChip] = useState<WeatherChip | null>(null)
  const [swing, setSwing] = useState<string | null>(null)
  const [weatherNote, setWeatherNote] = useState('')
  // Hidden demo menu for filming: tap the Haggling's name 5 times quickly.
  const [demoOpen, setDemoOpen] = useState(false)
  const [demoNote, setDemoNote] = useState('')
  const taps = useRef<number[]>([])
  const [filmNote, setFilmNote] = useState('')
  const h = egg.haggling
  const temp = temperamentForChaos(egg.answers.chaos)
  // phone-home R4: only the home device cares; others watch.
  const isHome = Boolean(h?.homeDeviceId) && h?.homeDeviceId === getDeviceId()
  const noHomeYet = !h?.homeDeviceId

  useEffect(() => {
    void reminderState().then(setReminders)
  }, [])

  useEffect(() => {
    if (!isHome) return
    tickHaggling(egg.id)
    onChange()
    const t = window.setInterval(() => {
      setNow(Date.now())
      tickHaggling(egg.id)
      onChange()
    }, 30_000)
    return () => window.clearInterval(t)
  }, [egg.id, isHome])

  // weather-mood: apply new weather when opened and every 15 minutes (home device only).
  useEffect(() => {
    if (!isHome || !choice) return
    const run = () =>
      void syncWeather(egg.id).then((r) => {
        setChip(r.chip)
        if (r.swingLine) setSwing(r.swingLine)
        onChange()
      })
    run()
    const t = window.setInterval(run, 15 * 60 * 1000)
    return () => window.clearInterval(t)
  }, [egg.id, isHome, choice])

  // phone-home R5.2: notice within a minute if the Haggling moved to another device.
  useEffect(() => {
    const check = () =>
      void refreshHomeDevice(egg.id).then((r) => {
        if (r !== null) onChange()
      })
    check()
    const t = window.setInterval(check, 60_000)
    return () => window.clearInterval(t)
  }, [egg.id])

  // play-film R3/T4: announce the playing film once, when it unlocks.
  const filmReady =
    Boolean(h) && isPlayFilmUnlocked(h?.hatchedAt, isDemoEgg(egg.createdAt, egg.readyAt), now)
  useEffect(() => {
    if (!filmReady || !h) return
    const key = `haggis-gotchi:play-film-seen:${egg.id}`
    if (localStorage.getItem(key)) return
    localStorage.setItem(key, '1')
    setFilmNote(`New film in Watch again: ${h.name} playing!`)
  }, [filmReady, egg.id])

  // Demo eggs unlock after 3 minutes: keep the clock moving while the screen is open.
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 15_000)
    return () => window.clearInterval(t)
  }, [])

  if (!h) return null

  const breakfastHour = h.breakfastHour ?? h.feedHour ?? 8
  const dinnerHour = h.dinnerHour ?? 18
  const alert = careAlertFor(h)
  const healthXp = typeof h.healthXp === 'number' ? h.healthXp : 50
  const level = lifeLevel(h.lifeXp ?? 0)
  const playUnlocked = isPlayFilmUnlocked(h.hatchedAt, isDemoEgg(egg.createdAt, egg.readyAt), now)
  const levelPct = Math.round(
    ((level.xp - level.levelStart) / Math.max(1, level.nextAt - level.levelStart)) * 100,
  )

  function act(action: CareAction) {
    if (!isHome) return
    void careActionSynced(egg.id, action, 'phone').then(() => onChange())
  }

  async function pickWeather(kind: 'location' | 'home') {
    setWeatherNote('')
    if (kind === 'location') {
      const r = await chooseLocation()
      if (r.error) setWeatherNote(r.error)
    } else {
      await chooseHomePlace()
    }
    setChoice(weatherChoice())
  }

  function tapName() {
    const now = Date.now()
    taps.current = [...taps.current.filter((t) => now - t < 3000), now]
    if (taps.current.length >= 5) {
      taps.current = []
      setDemoOpen((v) => !v)
    }
  }

  function demoWeather(bucket: (typeof WEATHER_BUCKETS)[number]) {
    const r = applyDemoWeather(egg.id, bucket)
    setChip(r.chip)
    setSwing(r.applied ? r.swingLine : null)
    setDemoNote(r.applied ? `Demo: ${WEATHER_LABEL[bucket]}` : `${WEATHER_LABEL[bucket]} already shown today (once per day each)`)
    onChange()
  }

  function moveHere() {
    setMoveError('')
    setMoveBusy(true)
    void moveHereSynced(egg.id).then((ok) => {
      setMoveBusy(false)
      if (!ok) setMoveError('Could not move them. Check you are signed in and online, then try again.')
      onChange()
    })
  }

  async function toggleReminders() {
    setReminderNote('')
    if (reminders === 'on') {
      await disableReminders()
      setReminders(await reminderState())
      setReminderNote('Reminders off.')
      return
    }
    const r = await enableReminders()
    setReminders(await reminderState())
    setReminderNote(r.ok ? `Reminders on. ${h?.name} will tell you at meal times and when a bar empties.` : (r.error ?? ''))
  }

  async function onPhoto(file: File | undefined) {
    if (!file) return
    setTreatNote(null)
    setTreatBusy(true)
    try {
      const small = await shrinkPhoto(file)
      const r = await photoTreatSynced(egg.id, small)
      if (r.ok) {
        setTreatNote({
          good: true,
          text: r.placeholder
            ? `${r.line} (Recognition is not switched on yet, so any photo counts for now.)`
            : r.line,
        })
      } else {
        setTreatNote({ good: false, text: r.error })
      }
      onChange()
    } catch {
      setTreatNote({ good: false, text: 'Could not read that photo. Try another.' })
    } finally {
      setTreatBusy(false)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  async function shareOnSocial() {
    const name = h?.name ?? 'my Haggling'
    const text = `Meet ${name}, a ${temp.label} Haggling from Haggis-gotchi.`
    try {
      if (navigator.share) {
        await navigator.share({ title: name, text, url: window.location.origin })
        setShareNote('Shared')
      } else {
        await navigator.clipboard?.writeText(`${text} ${window.location.origin}`)
        setShareNote('Copied: paste it anywhere')
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
          <h2 onClick={tapName}>{h.name}</h2>
          <p className="care-sub">
            {temp.label} · {moodLabel(h.mood)} · {healthLabel(h)}
            {alert === 'amber' ? ' · amber warning' : ''}
            {alert === 'red' ? ' · sick' : ''}
            {!isHome ? ' · watching' : ''}
            {isHome && breakfastSoon ? ' · breakfast' : ''}
            {isHome && dinnerSoon ? ' · dinner' : ''}
            {isHome && bedSoon ? ' · bedtime' : ''}
          </p>
        </div>
      </header>

      <section className="care-level" aria-label="Life XP">
        <div className="meter-top">
          <span>Level {level.level}</span>
          <span>
            {level.xp} / {level.nextAt} Life XP
          </span>
        </div>
        <div className="meter-track" aria-hidden="true">
          <div className="meter-fill" style={{ width: `${levelPct}%` }} />
        </div>
      </section>

      {demoOpen ? (
        <section className="demo-menu" aria-label="Demo menu">
          <p className="signup-kicker">Demo menu (for filming)</p>
          <div className="demo-weather">
            {WEATHER_BUCKETS.map((b) => (
              <button key={b} type="button" className="btn btn-ghost" onClick={() => demoWeather(b)}>
                {WEATHER_ICON[b] ?? ''} {WEATHER_LABEL[b]}
              </button>
            ))}
          </div>
          {demoNote ? <p className="care-sub">{demoNote}</p> : null}
          <button type="button" className="btn btn-ghost" onClick={() => setDemoOpen(false)}>
            Close demo menu
          </button>
        </section>
      ) : null}

      {isHome && swing ? (
        <p className="weather-swing" role="status">
          {swing}
        </p>
      ) : null}

      {isHome && !choice ? (
        <section className="transfer-card weather-consent">
          <p className="signup-kicker">Weather</p>
          <p className="care-sub">
            Let {h.name} feel your weather? Haggis love rain and storms and sulk in the
            heat. We use only your rough area (about 11 km) to look up the weather,
            nothing else, and you can change it any time.
          </p>
          <div className="cta-row">
            <button type="button" className="btn btn-primary" onClick={() => void pickWeather('location')}>
              Use my location
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => void pickWeather('home')}>
              Use my home place
            </button>
          </div>
        </section>
      ) : null}
      {weatherNote ? <p className="care-sub">{weatherNote}</p> : null}

      {isHome && chip ? (
        <p className="weather-chip">
          <span aria-hidden="true">{WEATHER_ICON[chip.bucket] ?? '🌦️'}</span> {chip.label}
          {chip.tempC !== null ? ` · ${Math.round(chip.tempC)}°C` : ''} · {chip.place}
          {h.weatherLine && !swing ? <span className="weather-feel">{h.weatherLine}</span> : null}
          <button
            type="button"
            className="weather-change"
            onClick={() => void pickWeather(choice === 'location' ? 'home' : 'location')}
          >
            {choice === 'location' ? 'Use home place instead' : 'Use my location'}
          </button>
        </p>
      ) : null}

      {!isHome ? (
        <section className="transfer-card">
          <p className="signup-kicker">Watching</p>
          <p className="care-sub">
            {noHomeYet
              ? `${h.name} has no home device yet. Make this phone their home to care for them here.`
              : `${h.name} lives on another device, so this screen is read-only. Using a new phone? Move ${h.name} here. They move, never copy.`}
          </p>
          <button type="button" className="btn btn-primary" onClick={moveHere} disabled={moveBusy}>
            {moveBusy ? 'Moving…' : noHomeYet ? `Make this ${h.name}'s home` : `Move ${h.name} here`}
          </button>
          {moveError ? <p className="form-error">{moveError}</p> : null}
        </section>
      ) : null}

      <div className="care-stage">
        <img src={carePortraitFor(temp.id)} alt={`${h.name}, a ${temp.label} Haggling`} />
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
          Health XP is {healthXp} (below zero). {h.name} is sick until care recovers them.
        </p>
      ) : null}

      <p className="care-schedule">
        Breakfast <strong>{formatClockHour(breakfastHour)}</strong>
        {' · '}
        Dinner <strong>{formatClockHour(dinnerHour)}</strong>
        {' · '}
        Bed <strong>{formatClockHour(h.bedHour)}</strong>
      </p>

      {isHome ? (
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
          <button
            type="button"
            className="care-action care-action-treat"
            onClick={() => fileInput.current?.click()}
            disabled={treatBusy}
          >
            <span>{treatBusy ? 'Looking…' : 'Photo Treat'}</span>
            <small>Snap something Scottish: every bar fills, once a day</small>
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            capture="environment"
            hidden
            onChange={(e) => void onPhoto(e.target.files?.[0])}
          />
        </div>
      ) : null}
      {treatNote ? (
        <p className={treatNote.good ? 'care-sub treat-note' : 'form-error'}>{treatNote.text}</p>
      ) : null}

      {isHome ? (
        <section className="care-reminders">
          {reminders === 'unsupported' ? (
            <p className="care-sub">
              Reminders need the app on your home screen. Add Haggis-gotchi to your home
              screen, open it from the icon, then come back here.
            </p>
          ) : reminders === 'blocked' ? (
            <p className="care-sub">
              Notifications are blocked. Phone Settings, Apps, Haggis-gotchi (or Chrome),
              Notifications: allow, then reopen.
            </p>
          ) : (
            <button type="button" className="btn btn-ghost" onClick={() => void toggleReminders()}>
              {reminders === 'on' ? 'Turn reminders off' : 'Turn on reminders'}
            </button>
          )}
          {reminderNote ? <p className="care-sub">{reminderNote}</p> : null}
        </section>
      ) : null}

      <button type="button" className="btn btn-ghost" onClick={() => void shareOnSocial()}>
        Share {h.name} on social
      </button>
      {shareNote ? <p className="care-sub">{shareNote}</p> : null}

      {filmNote ? <p className="weather-swing">{filmNote}</p> : null}
      <WatchMemories temperamentId={temp.id} extras={h.memoryFilms ?? []} playUnlocked={playUnlocked} />

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
