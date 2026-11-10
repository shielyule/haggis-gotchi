import { useCallback, useEffect, useState } from 'react'
import { AuthBar } from './AuthBar'
import { NestApp } from './NestApp'
import { SignupForm } from './SignupForm'
import { careAlertFor } from './lib/health'
import { pullBroodFromCloud } from './lib/cloud'
import {
  eggSlug,
  eggsInBrood,
  eggsOnPhone,
  loadStore,
  replaceLocalBrood,
  type EggRecord,
} from './lib/storage'
import { openNestInNewTab, readNestSlugFromPath, slugifyName } from './lib/slug'
import './App.css'

type MotherView = 'home' | 'signup'

export default function App() {
  const nestSlug = readNestSlugFromPath()
  if (nestSlug) return <NestApp slug={nestSlug} />
  return <MotherApp />
}

/** `/` only — mother + brood. Hagglings open at /{slug} in another tab. */
function MotherApp() {
  const [view, setView] = useState<MotherView>('home')
  const [eggs, setEggs] = useState<EggRecord[]>(() => loadStore().eggs)
  const [demoCompress, setDemoCompress] = useState(true)
  const [carerEmail, setCarerEmail] = useState<string | null>(null)
  const [showRetrieve, setShowRetrieve] = useState(false)

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

  function openNest(egg: EggRecord) {
    const slug = eggSlug(egg) || slugifyName(egg.answers.displayName)
    openNestInNewTab(slug)
  }

  return (
    <div className="mother">
      <section className="hero" aria-label="Haggis-gotchi mother">
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
              Meet the mother. Claim an egg — your Haggling lives on its own page
              (and on your phone), never on this home. The scrapbook remembers
              everything.
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
                  document
                    .getElementById('brood')
                    ?.scrollIntoView({ behavior: 'smooth' })
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
                const egg = loadStore().eggs.find((e) => e.id === id)
                setView('home')
                if (egg) openNest(egg)
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
            />
          </div>
        ) : null}
      </section>

      <section className="brood" id="brood">
        <h2>Brood</h2>
        <p className="brood-lede">
          {broodEggs.length === 0
            ? 'Empty for now. Claim an egg — hatch and care open in a new tab at /your-name.'
            : `${broodEggs.length} with the mother (tap opens the nest in a new tab — never care on this page).`}
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
                  onClick={() => openNest(egg)}
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
                          : `/${eggSlug(egg)}`
                      : `${egg.status} · /${eggSlug(egg)}`}
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
              {collectedEggs.length} on phone — open nest from Retrieve after
              sign-in, or use the phone app.
            </p>
          ) : null}
          {showRetrieve ? (
            <>
              <AuthBar onAuthChange={onAuthChange} intent="retrieve" />
              {carerEmail && collectedEggs.length > 0 ? (
                <ul className="egg-list">
                  {collectedEggs.map((egg) => (
                    <li key={egg.id}>
                      <button
                        type="button"
                        className="egg-row"
                        onClick={() => openNest(egg)}
                      >
                        <strong>
                          {egg.haggling?.name ||
                            egg.answers.displayName ||
                            'Unnamed'}
                        </strong>
                        <span>on phone · /{eggSlug(egg)}</span>
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
              Opens with the Haggling on its nest page — not on the mother home.
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
        <span>Mother keeps the brood · Hagglings live at /your-name</span>
        <span>© {new Date().getFullYear()} Shiel Yule</span>
      </footer>
    </div>
  )
}
