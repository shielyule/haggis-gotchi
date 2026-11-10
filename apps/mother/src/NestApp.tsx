import { useCallback, useEffect, useState } from 'react'
import { AuthBar } from './AuthBar'
import { CareScreen, NameHagglingForm } from './CareScreen'
import { beatIndex, filledBeats } from './data/birthStories'
import {
  HATCH_FILM_FALLBACK,
  hatchFilmFor,
  temperamentForChaos,
} from './data/temperaments'
import { pullBroodFromCloud } from './lib/cloud'
import {
  eggSlug,
  findEggsBySlug,
  loadStore,
  markReadyCodeSent,
  replaceLocalBrood,
  type EggRecord,
} from './lib/storage'
import { setEggStatusSynced } from './lib/syncActions'

type NestView = 'waiting' | 'name' | 'care' | 'empty'

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

type Props = { slug: string }

/**
 * Personal nest: haggisgotchi.com/{slug}
 * Birth wait, hatch, name, and care — never rendered on `/`.
 */
export function NestApp({ slug }: Props) {
  const [eggs, setEggs] = useState<EggRecord[]>(() => loadStore().eggs)
  const mine = findEggsBySlug(eggs, slug)
  const [activeEggId, setActiveEggId] = useState<string | null>(
    () => mine[0]?.id ?? null,
  )
  const [view, setView] = useState<NestView>(() => {
    const egg = mine[0]
    if (!egg) return 'empty'
    if (egg.status === 'hatched' && egg.haggling) return 'care'
    if (egg.status === 'hatched') return 'name'
    return 'waiting'
  })
  const [now, setNow] = useState(() => Date.now())
  const [carerEmail, setCarerEmail] = useState<string | null>(null)

  const active = eggs.find((e) => e.id === activeEggId) ?? mine[0] ?? null

  const onAuthChange = useCallback((email: string | null) => {
    setCarerEmail(email)
  }, [])

  useEffect(() => {
    if (!carerEmail) return
    void pullBroodFromCloud().then((cloudEggs) => {
      if (!cloudEggs || cloudEggs.length === 0) return
      replaceLocalBrood(cloudEggs)
      setEggs(cloudEggs)
      const next = findEggsBySlug(cloudEggs, slug)
      if (next[0] && !activeEggId) setActiveEggId(next[0].id)
    })
  }, [carerEmail, slug, activeEggId])

  useEffect(() => {
    if (!active || active.status === 'hatched') return
    const t = window.setInterval(() => setNow(Date.now()), 500)
    return () => window.clearInterval(t)
  }, [active])

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

  if (!active) {
    return (
      <main className="nest nest-empty">
        <p className="brand">Haggis-gotchi</p>
        <h1>/{slug}</h1>
        <p>
          No Haggling for this nest on this device yet. Open the link from your
          ready email after claiming on the mother, or sign in to retrieve.
        </p>
        <AuthBar onAuthChange={onAuthChange} intent="retrieve" />
        <p>
          <a href="/">Back to the mother</a>
        </p>
      </main>
    )
  }

  return (
    <main className="nest">
      <header className="nest-top">
        <p className="brand brand-compact">Haggis-gotchi</p>
        <p className="nest-path">/{eggSlug(active)}</p>
        <a className="nest-mother-link" href="/">
          Mother &amp; brood
        </a>
      </header>

      {view === 'waiting' && active.status !== 'hatched' ? (
        <div className="wait-card" aria-live="polite">
          <p className="signup-kicker">Birthing</p>
          <h1>
            {eggReady
              ? `Ready for you, ${active.answers.displayName || 'carer'}`
              : `Hatching in ${formatRemaining(remaining)}`}
          </h1>
          <p className="story-beat">{shownBeat}</p>
          {eggReady ? (
            <>
              <p className="care-sub">
                Enter the 6-digit code from your email (this page is your secure
                nest — mother never shows the Haggling).
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
                    setView('name')
                  })
                }}
              >
                {carerEmail ? 'Hatch' : 'Verify your email to hatch'}
              </button>
            </>
          ) : null}
        </div>
      ) : null}

      {view === 'waiting' && active.status === 'hatched' && hatchedTemp ? (
        <div className="wait-card hatch-card">
          <p className="signup-kicker">A Haggling</p>
          <h1>
            {hatchedTemp.label}
            <span className="temperament-short"> — {hatchedTemp.short}</span>
          </h1>
          <HatchFilm eggId={active.id} temperamentId={hatchedTemp.id} />
          <p>
            {active.answers.displayName}&rsquo;s Haggling is{' '}
            {hatchedTemp.label.toLowerCase()}.
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setView(active.haggling ? 'care' : 'name')}
          >
            {active.haggling ? `Open ${active.haggling.name}` : 'Name your Haggling'}
          </button>
        </div>
      ) : null}

      {view === 'name' ? (
        <NameHagglingForm
          egg={active}
          onBack={() => setView('waiting')}
          onNamed={() => {
            setEggs(loadStore().eggs)
            setView('care')
          }}
        />
      ) : null}

      {view === 'care' && active.haggling ? (
        <CareScreen
          egg={active}
          onChange={() => setEggs(loadStore().eggs)}
          onBack={() => {
            window.location.href = '/'
          }}
        />
      ) : null}
    </main>
  )
}
