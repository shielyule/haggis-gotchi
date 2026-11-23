import QRCode from 'qrcode'
import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import { AuthBar } from './AuthBar'
import { NestApp } from './NestApp'
import { PhoneApp } from './PhoneApp'
import { PublicCard, readCardIdFromPath } from './PublicCard'
import { PrivacyPage, TermsPage } from './Legal'
import { fetchGraveyard, fetchPublicFeed, type FeedRow, type Stone } from './lib/cloud'
import { carePortraitFor, ghostPortraitFor, TEMPERAMENTS } from './data/temperaments'
import { isDesktopLayout } from './lib/device'
import { feedSentence, timeAgo } from './lib/feed'
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

/** graveyard-3d: its own chunk, so the phone app never downloads it. */
const GraveyardPage = lazy(() => import('./graveyard/GraveyardPage'))
/** ai-haggling R2: the scrapbook book, its own tab and chunk. */
const ScrapbookBook = lazy(() => import('./ScrapbookBook'))

/**
 * phone-home R1: one site, two faces. Phones get the Haggling; desktops get the mother.
 * Layout only, never security.
 */
export default function App() {
  // graveyard-3d: the painted kirkyard, any device, no sign-in.
  if (window.location.pathname.replace(/\/+$/, '') === '/haggis-graveyard') {
    return (
      <Suspense fallback={<p style={{ padding: '2rem' }}>Walking up to the kirk…</p>}>
        <GraveyardPage />
      </Suspense>
    )
  }
  // Review 22 Nov: privacy notice (with delete-account) and terms.
  const path = window.location.pathname.replace(/\/+$/, '')
  if (path === '/privacy') return <PrivacyPage />
  if (path === '/scrapbook') {
    return (
      <Suspense fallback={<p style={{ padding: '2rem' }}>Dusting off the scrapbook…</p>}>
        <ScrapbookBook />
      </Suspense>
    )
  }
  if (path === '/terms') return <TermsPage />
  // share-card: public Haggling card, any device, no sign-in.
  const cardId = readCardIdFromPath()
  if (cardId) return <PublicCard id={cardId} />
  // /mother always shows the mother, on any device (Mother buttons link here).
  if (window.location.pathname.replace(/\/+$/, '') === '/mother') return <MotherApp />
  if (!isDesktopLayout()) return <PhoneApp />
  const nestSlug = readNestSlugFromPath()
  if (nestSlug) return <NestApp slug={nestSlug} />
  return <MotherApp />
}

/** public-feed: the brood's last 10 moments, for everyone. Polls every 30 s. */
function BroodFeed() {
  const [rows, setRows] = useState<FeedRow[] | null>(null)
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const load = () =>
      void fetchPublicFeed().then((r) => {
        if (r) setRows(r)
        setNow(Date.now())
      })
    load()
    const t = window.setInterval(load, 30_000)
    return () => window.clearInterval(t)
  }, [])
  if (rows === null) return <p>Listening to the glen…</p>
  if (rows.length === 0) return <p>Quiet in the glen. Claim an egg to start the story.</p>
  return (
    <ul className="brood-feed">
      {rows.map((r) => (
        <li key={`${r.at}-${r.carer_name}-${r.haggling_name}-${r.action}`}>
          <span>{feedSentence(r)}</span>
          <time dateTime={r.at}>{timeAgo(r.at, now)}</time>
        </li>
      ))}
    </ul>
  )
}

/** lifespan-graveyard R4: the mother's graveyard (stones only). The 3D graveyard reads the same list. */
function Graveyard() {
  const [stones, setStones] = useState<Stone[] | null>(null)
  useEffect(() => {
    void fetchGraveyard().then(setStones)
  }, [])
  if (stones === null) return <p>The mist is lifting…</p>
  if (stones.length === 0) return <p>No stones yet. Every Haggling lives about six weeks.</p>
  return (
    <ul className="graveyard-list">
      {stones.map((g) => (
        <li key={`${g.name}-${g.departed_at}`}>
          <img
            className={g.ghost ? '' : 'stone-portrait'}
            src={g.ghost ? ghostPortraitFor(g.temperament_id) : carePortraitFor(g.temperament_id)}
            alt=""
            width={56}
            height={56}
          />
          <div>
            <strong>{g.name}</strong>{' '}
            <span className="care-sub">
              {TEMPERAMENTS.find((t) => t.id === g.temperament_id)?.label ?? ''} · {g.days_lived} days
              {g.ghost ? ' · a ghost lingers' : ''}
            </span>
            <p className="epitaph">{g.epitaph}</p>
            {g.public_id ? <a href={`/h/${g.public_id}`}>Memorial card</a> : null}
          </div>
        </li>
      ))}
    </ul>
  )
}

/** QR to the site itself: scanning it on a phone opens the phone flow. */
function PhoneQr() {
  const [src, setSrc] = useState('')
  useEffect(() => {
    void QRCode.toDataURL(window.location.origin + '/', { margin: 1, width: 200 }).then(setSrc)
  }, [])
  if (!src) return null
  return (
    <div className="phone-qr">
      {/* Clicking the code opens the same place as scanning it (owner, 19 Nov). */}
      <a href="/" target="_blank" rel="noopener noreferrer" title="Open Haggis-gotchi">
        <img src={src} width={200} height={200} alt="QR code: open Haggis-gotchi on your phone" />
      </a>
      <p>
        <strong>Your Haggling lives on your phone.</strong> Point your phone camera here
        to claim an egg. Haggis-gotchi is a <strong>web app</strong>: it opens in your
        phone&rsquo;s browser, with no app store needed.
      </p>
    </div>
  )
}

/** `/` only — mother + brood. Hagglings open at /{slug} in another tab. */
function MotherApp() {
  const [eggs, setEggs] = useState<EggRecord[]>(() => loadStore().eggs)
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

        <div className="hero-copy">
          <p className="brand">Haggis-gotchi</p>
          <h1 className="headline">The cloud mother keeps the brood.</h1>
          <p className="lede">
            Meet the mother. Each Haggling is born on its carer&rsquo;s phone and lives
            there. Here you can watch the brood, the scrapbook and the graveyard.
          </p>
          <PhoneQr />
          <div className="cta-row">
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
        </div>
      </section>

      <section className="brood" id="brood">
        <h2>Brood</h2>
        <p className="brood-lede">
          {broodEggs.length === 0
            ? 'Empty for now. Claim an egg on your phone (scan the code above).'
            : `${broodEggs.length} with the mother. Tap one to watch it in a new tab.`}
        </p>

        {broodEggs.length === 0 ? (
          <div className="brood-empty">
            <strong>No eggs with the mother</strong>
            Claim one on your phone to start. Sign in below (Retrieve) to watch your
            Haggling from this computer.
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
            <BroodFeed />
          </div>
          <div className="yard-block">
            <h3>
              <a
                className="yard-link"
                href="/haggis-graveyard"
                target="_blank"
                rel="noopener noreferrer"
              >
                Graveyard
              </a>
            </h3>
            <p>
              <a href="/haggis-graveyard" target="_blank" rel="noopener noreferrer">
                Explore the Haggis Kirkyard (opens in a new tab)
              </a>
            </p>
            <Graveyard />
          </div>
        </div>
      </section>

      <footer className="foot">
        <span>Mother keeps the brood · Hagglings live at /your-name</span>
        <span>
          <a href="/privacy">Privacy</a> · <a href="/terms">Terms</a> · © {new Date().getFullYear()} Shiel Yule
        </span>
      </footer>
    </div>
  )
}
