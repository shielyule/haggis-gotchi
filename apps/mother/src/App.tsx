import { useCallback, useEffect, useState } from 'react'
import { AuthBar } from './AuthBar'
import { CareScreen, NameHagglingForm } from './CareScreen'
import { beatIndex, filledBeats } from './data/birthStories'
import {
  HATCH_FILM_FALLBACK,
  hatchFilmFor,
  temperamentForChaos,
} from './data/temperaments'
import { SignupForm } from './SignupForm'
import { careAlertFor } from './lib/health'
import { pullBroodFromCloud } from './lib/cloud'
import {
  eggsInBrood,
  eggsOnPhone,
  loadStore,
  markReadyCodeSent,
  replaceLocalBrood,
  type EggRecord,
} from './lib/storage'
import { setEggStatusSynced } from './lib/syncActions'
import './App.css'

type View = 'home' | 'signup' | 'waiting' | 'name' | 'care'

function HatchFilm({
  eggId,
  temperamentId,
}: {
  eggId: string
  temperamentId: string
}) {
  const preferred = hatchFilmFor(temperamentId)
  const [src, setSrc] = useState(preferred)

  useEffect(() => {
    setSrc(preferred)
  }, [preferred, eggId])

  return (
    <video
      key={`${eggId}-${src}`}
      className="hatch-film"
      autoPlay
      muted
      playsInline
      controls
      poster="/art/haggis-hero.jpg"
      onError={() => {
        if (src !== HATCH_FILM_FALLBACK) setSrc(HATCH_FILM_FALLBACK)
      }}
    >
      <source src={src} type="video/mp4" />
    </video>
  )
}

function formatRemaining(ms: number) {
  if (ms <= 0) return 'Ready'
  const s = Math.ceil(ms / 1000)
  const m = Math.floor(s / 60)
  const r = s % 60
  return m > 0 ? `${m}m ${r}s` : `${r}s`
}

export default function App() {
  const [view, setView] = useState<View>('home')
  const [eggs, setEggs] = useState<EggRecord[]>(() => loadStore().eggs)
  const [activeEggId, setActiveEggId] = useState<string | null>(null)
  const [demoCompress, setDemoCompress] = useState(true)
  const [now, setNow] = useState(() => Date.now())
  const [carerEmail, setCarerEmail] = useState<string | null>(null)
  const [showRetrieve, setShowRetrieve] = useState(false)

  const active = eggs.find((e) => e.id === activeEggId) ?? null
  const broodEggs = eggsInBrood(eggs)
  const collectedEggs = eggsOnPhone(eggs)

  const onAuthChange = useCallback((email: string | null) => {
    setCarerEmail(email)
  }, [])

  useEffect(() => {
    if (!carerEmail) return
    void pullBroodFromCloud().then((cloudEggs) => {
      if (!cloudEggs) return
      if (cloudEggs.length === 0) return
      replaceLocalBrood(cloudEggs)
      setEggs(cloudEggs)
    })
  }, [carerEmail])

  useEffect(() => {
    if (view !== 'waiting' || !active || active.status === 'hatched') return
    const t = window.setInterval(() => setNow(Date.now()), 500)
    return () => window.clearInterval(t)
  }, [view, active])

  const remaining = active
    ? Math.max(0, new Date(active.readyAt).getTime() - now)
    : 0
  const eggReady =
    Boolean(active) &&
    active!.status !== 'hatched' &&
    remaining === 0

  useEffect(() => {
    if (!active || active.status !== 'waiting' || remaining > 0) return
    void setEggStatusSynced(active.id, 'ready').then((next) => {
      if (next) {
        setEggs(loadStore().eggs)
        if (!next.readyCodeSentAt && next.answers.email) {
          markReadyCodeSent(next.id)
          setEggs(loadStore().eggs)
        }
      }
    })
  }, [active, remaining])

  const storyBeats = active ? filledBeats(active.answers, active.storyId) : []
  const shownBeat =
    active && active.status !== 'hatched'
      ? storyBeats[beatIndex(active.createdAt, active.readyAt, now)]
      : ''
  const hatchedTemp = active ? temperamentForChaos(active.answers.chaos) : null
  const panelOpen =
    view === 'signup' ||
    view === 'waiting' ||
    view === 'name' ||
    view === 'care'

  function openEgg(egg: EggRecord) {
    setActiveEggId(egg.id)
    window.scrollTo({ top: 0, behavior: 'smooth' })
    if (egg.status === 'hatched' && egg.haggling) {
      setView('care')
      return
    }
    if (egg.status === 'hatched' && !egg.haggling) {
      setView('name')
      return
    }
    setView('waiting')
  }

  return (
    <div className="mother">
      <section
        className={`hero${panelOpen ? ' hero-panel-open' : ''}`}
        aria-label="Haggis-gotchi mother"
      >
        <video
          className="hero-art hero-video"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster="/art/mother-haggis.jpeg"
          aria-hidden="true"
        >
          <source src="/art/mother-haggis-animated.mp4" type="video/mp4" />
        </video>
        <img
          className="hero-art hero-still"
          src="/art/mother-haggis.jpeg"
          alt="Mother Haggis in tartan tam and floral apron, soft feathered shading"
        />
        <div className="hero-veil" aria-hidden="true" />

        {view === 'home' ? (
          <div className="hero-copy">
            <p className="brand">Haggis-gotchi</p>
            <h1 className="headline">The cloud mother keeps the brood.</h1>
            <p className="lede">
              Meet the mother. Answer a few questions, wait while she spins a
              birth tale, and collect your Scottish Haggis-gotchi on your phone.
              Look after it well — the scrapbook remembers everything. Fancy a
              desk beast? Pair a Raspberry Pi later for the same child, with a
              few hearth bonuses.
            </p>
            <div className="cta-row">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setView('signup')
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }}
              >
                Claim an egg
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() =>
                  document.getElementById('brood')?.scrollIntoView({ behavior: 'smooth' })
                }
              >
                See the brood
              </button>
            </div>
            <label className="demo-toggle">
              <input
                type="checkbox"
                checked={demoCompress}
                onChange={(e) => setDemoCompress(e.target.checked)}
              />
              Demo wait (~90s instead of 30 min)
            </label>
          </div>
        ) : null}

        {view === 'signup' ? (
          <div className="hero-panel" id="claim">
            <p className="brand brand-compact">Haggis-gotchi</p>
            <SignupForm
              demoCompress={demoCompress}
              onCancel={() => setView('home')}
              onClaimed={(id) => {
                setEggs(loadStore().eggs)
                setActiveEggId(id)
                setView('waiting')
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
            />
          </div>
        ) : null}

        {view === 'waiting' && active && active.status !== 'hatched' ? (
          <div className="hero-panel" id="waiting" aria-live="polite">
            <p className="brand brand-compact">Haggis-gotchi</p>
            <div className="wait-card">
              <p className="signup-kicker">Birthing</p>
              <h2>
                {eggReady
                  ? `Ready for you, ${active.answers.displayName || 'carer'}`
                  : `Hatching in ${formatRemaining(remaining)}`}
              </h2>
              <p className="story-beat">{shownBeat}</p>
              {eggReady ? (
                <>
                  <p className="care-sub">
                    We&rsquo;ll email a 6-digit code to{' '}
                    <strong>{active.answers.email || 'your email'}</strong>.
                    Enter it here, then hatch.
                  </p>
                  <AuthBar
                    onAuthChange={onAuthChange}
                    presetEmail={active.answers.email}
                    intent="hatch"
                    autoSend={Boolean(active.answers.email)}
                  />
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={!carerEmail}
                    onClick={() => {
                      void setEggStatusSynced(active.id, 'hatched').then(() => {
                        setEggs(loadStore().eggs)
                      })
                    }}
                  >
                    {carerEmail ? 'Hatch' : 'Verify your email to hatch'}
                  </button>
                </>
              ) : null}
            </div>
          </div>
        ) : null}

        {view === 'waiting' && active && active.status === 'hatched' && hatchedTemp ? (
          <div className="hero-panel" id="hatched">
            <p className="brand brand-compact">Haggis-gotchi</p>
            <div className="wait-card hatch-card">
              <p className="signup-kicker">A Haggling</p>
              <h2>
                {hatchedTemp.label}
                <span className="temperament-short"> — {hatchedTemp.short}</span>
              </h2>
              <HatchFilm eggId={active.id} temperamentId={hatchedTemp.id} />
              <p>
                {active.answers.displayName}&rsquo;s Haggling is{' '}
                {hatchedTemp.label.toLowerCase()}. A Haggling is a baby Haggis,
                the way a hatchling is a baby bird.
              </p>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setView(active.haggling ? 'care' : 'name')
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }}
              >
                {active.haggling ? `Open ${active.haggling.name}` : 'Name your Haggling'}
              </button>
            </div>
          </div>
        ) : null}

        {view === 'name' && active ? (
          <div className="hero-panel" id="name">
            <p className="brand brand-compact">Haggis-gotchi</p>
            <NameHagglingForm
              egg={active}
              onBack={() => setView('waiting')}
              onNamed={() => {
                setEggs(loadStore().eggs)
                setView('care')
              }}
            />
          </div>
        ) : null}

        {view === 'care' && active?.haggling ? (
          <div className="hero-panel hero-panel-care" id="care">
            <CareScreen
              egg={active}
              onChange={() => setEggs(loadStore().eggs)}
              onBack={() => setView('home')}
            />
          </div>
        ) : null}
      </section>

      <section className="brood" id="brood">
        <h2>Brood</h2>
        <p className="brood-lede">
          {broodEggs.length === 0
            ? 'Empty for now. Claim an egg above — when it is ready you verify by email, then it can move to your phone.'
            : `${broodEggs.length} with the mother (phone-collected pets are hidden until you retrieve).`}
        </p>

        {broodEggs.length === 0 ? (
          <div className="brood-empty">
            <strong>No eggs with the mother</strong>
            Claim one to start. After it lives on your phone it leaves this list —
            use Retrieve below to get it back.
          </div>
        ) : (
          <ul className="egg-list">
            {broodEggs.map((egg) => (
              <li key={egg.id}>
                <button
                  type="button"
                  className={`egg-row${
                    egg.haggling
                      ? ` egg-alert-${careAlertFor(egg.haggling)}`
                      : ''
                  }`}
                  onClick={() => openEgg(egg)}
                >
                  <strong>
                    {egg.haggling?.name ||
                      egg.answers.displayName ||
                      'Unnamed'}
                  </strong>
                  <span>
                    {egg.haggling
                      ? careAlertFor(egg.haggling) === 'red'
                        ? 'sick'
                        : careAlertFor(egg.haggling) === 'amber'
                          ? 'peaky'
                          : 'with mother'
                      : egg.status}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="retrieve-block">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setShowRetrieve((v) => !v)}
          >
            {showRetrieve ? 'Hide retrieve' : 'Retrieve my Haggling'}
          </button>
          {collectedEggs.length > 0 && carerEmail ? (
            <p className="care-sub">
              {collectedEggs.length} on phone — open care from Retrieve list after
              sign-in, or use the phone app.
            </p>
          ) : null}
          {showRetrieve ? (
            <>
              <AuthBar
                onAuthChange={onAuthChange}
                intent="retrieve"
              />
              {carerEmail && collectedEggs.length > 0 ? (
                <ul className="egg-list">
                  {collectedEggs.map((egg) => (
                    <li key={egg.id}>
                      <button
                        type="button"
                        className="egg-row"
                        onClick={() => openEgg(egg)}
                      >
                        <strong>
                          {egg.haggling?.name ||
                            egg.answers.displayName ||
                            'Unnamed'}
                        </strong>
                        <span>on phone · reopen</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </>
          ) : null}
        </div>

        <div className="yard">
          <div className="yard-block">
            <h3>Scrapbook</h3>
            <p>
              Opens with the Haggling. Care and missed windows write the pages.
            </p>
          </div>
          <div className="yard-block">
            <h3>Graveyard</h3>
            <p>
              When the span ends, memory lives here. Ghosts are optional and
              read-only for the MVP.
            </p>
          </div>
        </div>
      </section>

      <footer className="foot">
        <span>Mother keeps the brood · kids live on the phone</span>
        <span>© {new Date().getFullYear()} Shiel Yule</span>
      </footer>
    </div>
  )
}
