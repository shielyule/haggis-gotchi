import { useEffect, useRef, useState } from 'react'
import { ghostPortraitFor, stagePortraitFor, temperamentForChaos } from './data/temperaments'
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
import { addScrap, identityAt, identityLabel, identityMessage, isDemoEgg, isPlayFilmUnlocked, lifeStatus, WEATHER_BUCKETS, WEATHER_LABEL } from './lib/engine'
import {
  applyDemoWeather,
  chooseHomePlace,
  chooseLocation,
  syncWeather,
  weatherChoice,
  type WeatherChip,
} from './lib/weather'
import { fetchShareInfo, fetchShowInFeed, lifecycleAction, pullBroodFromCloud, pushCheckIn, saveShowInFeed, setShareEnabled } from './lib/cloud'
import { loadStore, replaceHaggling, replaceLocalBrood } from './lib/storage'
import { CareIntro, introSeen } from './CareIntro'
import { InfoTip } from './InfoTip'
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


/** Traffic-light bar (owner, 20 Nov): red when empty, amber halfway, green when full.
 *  The gradient spans the whole track, so a short bar shows only its red end.
 *  `bad` reverses it for Mess, where high is bad. */
function trafficStyle(value: number) {
  const v = Math.max(0, Math.min(100, value))
  return { width: `${v}%`, backgroundSize: v > 0 ? `${10000 / v}% 100%` : undefined }
}

function Meter({ label, value, bad = false }: { label: string; value: number; bad?: boolean }) {
  return (
    <div className="meter">
      <div className="meter-top">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <div className="meter-track" aria-hidden="true">
        <div className={`meter-fill meter-traffic${bad ? ' meter-traffic-bad' : ''}`} style={trafficStyle(value)} />
      </div>
    </div>
  )
}

function nearHour(hour: number, target: number) {
  return Math.abs(hour - target) <= 1 || Math.abs(hour - target) >= 23
}

/** Shrink on the device before upload (photo-care R1.3): long side <= 1600 px (sharp enough for can lettering), JPEG. */
async function shrinkPhoto(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(bitmap.width * scale))
  canvas.height = Math.max(1, Math.round(bitmap.height * scale))
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close?.()
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('encode failed'))), 'image/jpeg', 0.9),
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
  const [introOpen, setIntroOpen] = useState(() => !introSeen())
  const [identityAck, setIdentityAck] = useState(0)
  const [stageAck, setStageAck] = useState(0)
  const [share, setShare] = useState<{ publicId: string; on: boolean } | null>(null)
  const [inFeed, setInFeed] = useState<boolean | null>(null)
  const h = egg.haggling
  const temp = temperamentForChaos(egg.answers.chaos)
  // phone-home R4: only the home device cares; others watch.
  const departedNow =
    Boolean(h?.departedAt) || (h?.spanEndsAt ? Date.now() >= Date.parse(h.spanEndsAt) : false)
  const isHome = Boolean(h?.homeDeviceId) && h?.homeDeviceId === getDeviceId() && !departedNow
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
    Boolean(h) && isPlayFilmUnlocked(h?.hatchedAt, isDemoEgg(egg.demo, egg.createdAt, egg.readyAt), now)
  useEffect(() => {
    if (!filmReady || !h) return
    const key = `haggis-gotchi:play-film-seen:${egg.id}`
    if (localStorage.getItem(key)) return
    localStorage.setItem(key, '1')
    setFilmNote(`New film in Watch again: ${h.name} playing!`)
  }, [filmReady, egg.id])

  // share-card: the public id comes from the server.
  useEffect(() => {
    const childId = h?.cloudChildId
    if (!childId) return
    void fetchShareInfo(childId).then(setShare)
  }, [h?.cloudChildId])

  // public-feed R5: the carer's tick box.
  useEffect(() => {
    void fetchShowInFeed().then(setInFeed)
  }, [])

  // Demo eggs unlock after 3 minutes: keep the clock moving while the screen is open.
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 15_000)
    return () => window.clearInterval(t)
  }, [])

  if (!h) return null

  const life = lifeStatus(h.bornAt ?? h.hatchedAt, h.spanEndsAt, now, h.departedAt)
  const isDemo = isDemoEgg(egg.demo, egg.createdAt, egg.readyAt)
  // Teen identity (agreed 20 Nov): random, opted-in only, no outcome better or worse.
  const identity = identityAt(egg.id, egg.answers.teenIdentityOptIn === true, life.day)
  const who = identityLabel(h.sex, identity)
  const ackKey = `haggis-gotchi:identity-ack:${egg.id}:${identity}`
  const identityNews = identityAck >= 0 && !localStorage.getItem(ackKey) ? identityMessage(h.name, h.sex, identity) : null
  function supportIdentity(kind: 'hug' | 'words') {
    const e = loadStore().eggs.find((x) => x.id === egg.id)
    if (e?.haggling) {
      const next = structuredClone(e.haggling)
      addScrap(
        next,
        kind === 'hug'
          ? `${next.name} let you give them a big hug. For once, no "Really?!".`
          : `You told ${next.name} you love them, just as they are. ${next.name} rolled their eyes and smiled.`,
      )
      replaceHaggling(egg.id, next)
    }
    localStorage.setItem(ackKey, '1')
    setIdentityAck((n) => n + 1)
    onChange()
  }
  // Growing up (owner, 21 Nov): a big announcement once per new stage, with the new picture.
  const stageKey = `haggis-gotchi:stage-seen:${egg.id}:${life.stage}`
  const stageNews = stageAck >= 0 && life.stage !== 'baby' && !localStorage.getItem(stageKey)
  const STAGE_NEWS: Record<string, string> = {
    child: `${h.name} is a Child now! Off to play out: walks and treats go down a storm.`,
    teen: `${h.name} is a Teen now! Expect long lie-ins, big appetites and absolutely no cuddles in public.`,
    adult: `${h.name} is all grown up! A taste for fine food and a tidy house.`,
    elder: `${h.name} is getting on now. Gentle walks, soft tatties and plenty of cuddles.`,
  }
  const asleep = Boolean(h.asleepUntil) && now < Date.parse(h.asleepUntil ?? '')
  const wakeTime = asleep
    ? new Date(h.asleepUntil!).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
    : ''

  // lifespan-graveyard R2/R5: the final page.
  if (life.departed) {
    const ghost = h.ghostOptIn === true
    return (
      <div className="care phone-shell final-page">
        <p className="signup-kicker">Gone to the glen</p>
        <h2>{h.name}</h2>
        <div className="care-stage">
          <img
            className={ghost ? '' : 'ghost-portrait'}
            src={ghost ? ghostPortraitFor(temp.id) : stagePortraitFor(temp.id, life.stage)}
            alt={ghost ? `The ghost of ${h.name}` : `${h.name}, remembered`}
          />
        </div>
        <p className="epitaph">{h.epitaph ?? 'The mother is carving the stone. Back in a few minutes…'}</p>
        <p className="care-sub">
          {temp.label} · {life.day} days · Level {lifeLevel(h.lifeXp ?? 0).level}
        </p>
        {h.departedAt && h.ghostOptIn == null ? (
          <section className="transfer-card">
            <p className="care-sub">Keep a wee ghost of {h.name} in the mother&rsquo;s graveyard?</p>
            <div className="cta-row">
              <button type="button" className="btn btn-primary" onClick={() => void chooseGhost(true)}>
                Keep a ghost
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => void chooseGhost(false)}>
                Let them rest
              </button>
            </div>
          </section>
        ) : ghost ? (
          <p className="care-sub">A wee ghost of {h.name} drifts between the stones.</p>
        ) : null}
        <section className="care-scrap">
          <h3>Last pages</h3>
          <ul>
            {h.scrapbook.slice(0, 5).map((e) => (
              <li key={e.id}>
                <span>{e.text}</span>
              </li>
            ))}
          </ul>
        </section>
        <div className="cta-row">
          <a className="btn btn-primary" href="/?new=1">
            Claim a new egg
          </a>
          <a className="btn btn-ghost" href="/mother">
            Visit the graveyard
          </a>
        </div>
      </div>
    )
  }

  const breakfastHour = h.breakfastHour ?? h.feedHour ?? 8
  const dinnerHour = h.dinnerHour ?? 18
  const alert = careAlertFor(h)
  const healthXp = typeof h.healthXp === 'number' ? h.healthXp : 50
  const level = lifeLevel(h.lifeXp ?? 0)
  const playUnlocked = isPlayFilmUnlocked(h.hatchedAt, isDemoEgg(egg.demo, egg.createdAt, egg.readyAt), now)
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

  /** Pull this carer's brood from the cloud (after server-side life changes). */
  async function refreshFromCloud() {
    const cloud = await pullBroodFromCloud()
    if (cloud) replaceLocalBrood(cloud)
    onChange()
  }

  async function demoLife(action: 'next' | 'end' | 'day') {
    const childId = h?.cloudChildId
    if (!childId) return
    setDemoNote(action === 'end' ? 'Saying goodbye…' : 'Growing up…')
    const r = await lifecycleAction(childId, action)
    setDemoNote(r.ok ? (action === 'end' ? 'Gone to the glen.' : action === 'day' ? 'One day older.' : 'Next stage!') : (r.error ?? 'Could not do that.'))
    await refreshFromCloud()
  }

  /** Demo: skip the 8 hours of sleep (wakes rested, through the same engine rule). */
  function demoWake() {
    const e = loadStore().eggs.find((x) => x.id === egg.id)
    const hh = e?.haggling
    if (!e || !hh?.asleepUntil) {
      setDemoNote('Not asleep just now. Tap Put to bed first.')
      return
    }
    const t = Date.now()
    replaceHaggling(egg.id, { ...hh, asleepUntil: new Date(t - 1000).toISOString(), lastTickAt: new Date(t - 120_000).toISOString() })
    tickHaggling(egg.id)
    const woke = loadStore().eggs.find((x) => x.id === egg.id)
    if (woke) void pushCheckIn(woke, 'phone')
    setDemoNote('Awake! (8 hours skipped)')
    onChange()
  }

  async function chooseGhost(keep: boolean) {
    const childId = h?.cloudChildId
    if (!childId) return
    await lifecycleAction(childId, 'ghost', keep)
    await refreshFromCloud()
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
            : `${r.line} Every bar is full! (Saw ${r.treat}${r.confidence ? `, ${r.confidence}% sure` : ''})`,
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
    // share-card R6: share the public card, not the home page.
    const url = share?.on ? `${window.location.origin}/h/${share.publicId}` : window.location.origin
    const text = `Meet ${name}, a ${temp.label} Haggling from Haggis-gotchi.`
    try {
      if (navigator.share) {
        await navigator.share({ title: name, text, url })
        setShareNote('Shared')
      } else {
        await navigator.clipboard?.writeText(`${text} ${url}`)
        setShareNote('Link copied: paste it anywhere')
      }
    } catch {
      setShareNote('Share cancelled')
    }
    window.setTimeout(() => setShareNote(''), 3500)
  }

  async function toggleShare() {
    const childId = h?.cloudChildId
    if (!childId || !share) return
    const next = !share.on
    if (await setShareEnabled(childId, next)) setShare({ ...share, on: next })
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
            {who ? `${who} · ` : ''}
            {life.label} · {life.daysLeft} days left · {temp.label} · {moodLabel(h.mood)} · {healthLabel(h)}
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
          <button type="button" className="btn btn-ghost" onClick={demoWake}>
            Wake up now (skip the sleep)
          </button>
          {isDemo ? (
            <div className="cta-row">
              <button type="button" className="btn btn-ghost" onClick={() => void demoLife('day')}>
                +1 day (day {life.day})
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => void demoLife('next')}>
                Next stage ({life.label} now)
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => void demoLife('end')}>
                Skip to the end
              </button>
            </div>
          ) : (
            <p className="care-sub">Life fast-forward works on demo eggs only.</p>
          )}
          {demoNote ? <p className="care-sub">{demoNote}</p> : null}
          <button type="button" className="btn btn-ghost" onClick={() => setDemoOpen(false)}>
            Close demo menu
          </button>
        </section>
      ) : null}

      {stageNews ? (
        <div className="info-modal stage-up" role="dialog" aria-modal="true" aria-label={`${h.name} has grown up`}>
          <div className="info-panel">
            <p className="signup-kicker">Growing up</p>
            <h2>{life.label}!</h2>
            <img className="stage-up-portrait" src={stagePortraitFor(temp.id, life.stage)} alt={`${h.name} as a ${life.label}`} />
            <p>{STAGE_NEWS[life.stage]}</p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                localStorage.setItem(stageKey, '1')
                setStageAck((n) => n + 1)
              }}
            >
              Brilliant!
            </button>
          </div>
        </div>
      ) : null}

      {isHome && identityNews ? (
        <section className="transfer-card identity-card">
          <p className="signup-kicker">Growing up</p>
          <p>{identityNews}</p>
          <div className="cta-row">
            <button type="button" className="btn btn-primary" onClick={() => supportIdentity('hug')}>
              Give them a big hug
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => supportIdentity('words')}>
              Tell them you love them just the same
            </button>
          </div>
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
        <img src={stagePortraitFor(temp.id, life.stage)} alt={`${h.name}, a ${temp.label} Haggling`} />
        {life.stage !== 'baby' ? <span className="stage-badge">{life.label}</span> : null}
        {asleep ? <span className="sleep-badge">Zzz… asleep until {wakeTime}</span> : null}
      </div>

      <div className="care-meters">
        <Meter label="Health XP" value={Math.max(0, Math.min(100, healthXp))} />
        <Meter label="Hunger" value={h.hunger} />
        <Meter label="Mood" value={h.mood} />
        <Meter label="Energy" value={h.energy} />
        <Meter label="Mess" value={h.mess} bad />
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
            <small>Snap Irn-Bru, bagpipes, a kilt, heather or shortbread: once a day</small>
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            capture="environment"
            hidden
            onChange={(e) => void onPhoto(e.target.files?.[0])}
          />
          <button
            type="button"
            className="care-action care-action-sleep"
            onClick={() => act('sleep')}
            disabled={asleep}
          >
            <span>{asleep ? `Asleep till ${wakeTime}` : 'Put to bed'}</span>
            <small>{asleep ? 'Feeding, walking or treats now wake them crabbit' : 'A good long sleep, wakes rested, tells you'}</small>
          </button>
        </div>
      ) : null}
      <button type="button" className="link-btn" onClick={() => setIntroOpen(true)}>
        How do the buttons work?
      </button>
      {introOpen ? <CareIntro name={h.name} onClose={() => setIntroOpen(false)} /> : null}
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
      {share ? (
        <label className="demo-toggle share-toggle">
          <input type="checkbox" checked={share.on} onChange={() => void toggleShare()} />
          Public card for {h.name} ({share.on ? 'on' : 'off'}){' '}
          <InfoTip text="A read-only page anyone with the link can see: portrait, level, bars and hatching film, with a 'Get your own egg' button. It never shows your name, email or where you live. Share on social sends this link when it is on." />
          {share.on ? (
            <a href={`/h/${share.publicId}`} target="_blank" rel="noopener noreferrer">
              {' '}
              see it
            </a>
          ) : null}
        </label>
      ) : null}
      {inFeed !== null && isHome ? (
        <label className="demo-toggle share-toggle">
          <input
            type="checkbox"
            checked={inFeed}
            onChange={(e) => {
              const v = e.target.checked
              void saveShowInFeed(v).then((ok) => ok && setInFeed(v))
            }}
          />
          Show {h.name} in the mother&rsquo;s public scrapbook{' '}
          <InfoTip text="The mother's page lists the brood's latest moments, like 'Fred just fed Harry'. Only your first name and your Haggling's name appear." />
        </label>
      ) : null}
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
  const [sex, setSex] = useState<'male' | 'female' | null>(null)
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
        if (!sex) {
          setError('Is your Haggling a wee laddie or a wee lassie?')
          return
        }
        void nameHagglingSynced(
          egg.id,
          name,
          breakfastHour,
          dinnerHour,
          bedHour,
          sex,
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

      <fieldset className="field sex-choice">
        <legend>Laddie or lassie?</legend>
        <label>
          <input type="radio" name="sex" checked={sex === 'male'} onChange={() => setSex('male')} /> Wee laddie (boy)
        </label>
        <label>
          <input type="radio" name="sex" checked={sex === 'female'} onChange={() => setSex('female')} /> Wee lassie (girl)
        </label>
      </fieldset>

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
