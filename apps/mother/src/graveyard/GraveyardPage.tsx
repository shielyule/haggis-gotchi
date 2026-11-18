import { useCallback, useEffect, useRef, useState } from 'react'
import {
  LEVELS,
  TIMES,
  readViewFromSearch,
  viewAlt,
  viewSrc,
  type Level,
  type TimeOfDay,
  type ViewKey,
} from './views'
import './graveyard.css'

/** Fade length. Keep in step with `--gy-fade` in graveyard.css. */
const FADE_MS = 450

const MUSIC_SRC = '/graveyard/flowers-of-the-forest-solo.mp3'

/**
 * Background lament. Browsers block sound until the visitor has touched the page, so we try
 * to play on load and, if refused, start on the first click, tap or key press.
 * The visitor's choice (button) always wins.
 */
function useMusic() {
  const audio = useRef<HTMLAudioElement | null>(null)
  const wanted = useRef(true)
  const [playing, setPlaying] = useState(false)

  const start = useCallback(() => {
    const a = audio.current
    if (!a) return
    wanted.current = true
    a.play().then(
      () => setPlaying(true),
      () => setPlaying(false),
    )
  }, [])
  const stop = useCallback(() => {
    wanted.current = false
    audio.current?.pause()
    setPlaying(false)
  }, [])

  useEffect(() => {
    const a = new Audio(MUSIC_SRC)
    a.loop = true
    a.volume = 0.5
    audio.current = a
    start()
    const onFirstTouch = (e: Event) => {
      if (!wanted.current || !a.paused) return
      if (e.target instanceof Element && e.target.closest('[data-music-toggle]')) return
      start()
    }
    const onVisibility = () => {
      if (document.hidden) a.pause()
      else if (wanted.current) start()
    }
    window.addEventListener('pointerdown', onFirstTouch)
    window.addEventListener('keydown', onFirstTouch)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('pointerdown', onFirstTouch)
      window.removeEventListener('keydown', onFirstTouch)
      document.removeEventListener('visibilitychange', onVisibility)
      a.pause()
      audio.current = null
    }
  }, [start])

  return { playing, toggle: () => (playing ? stop() : start()) }
}

/**
 * graveyard-3d, Tier A: the painted kirkyard with a Day/Night and Above/Below switch.
 * Only the current and the outgoing picture are in the page, so memory stays small.
 */
export default function GraveyardPage() {
  const [view, setView] = useState<ViewKey>(() => readViewFromSearch(window.location.search))
  const [outgoing, setOutgoing] = useState<ViewKey | null>(null)
  const music = useMusic()

  function choose(next: Partial<ViewKey>) {
    const merged = { ...view, ...next }
    if (merged.time === view.time && merged.level === view.level) return
    setOutgoing(view)
    setView(merged)
    const url = new URL(window.location.href)
    url.searchParams.set('time', merged.time)
    url.searchParams.set('level', merged.level)
    window.history.replaceState(null, '', url)
  }

  useEffect(() => {
    if (!outgoing) return
    const t = window.setTimeout(() => setOutgoing(null), FADE_MS + 50)
    return () => window.clearTimeout(t)
  }, [outgoing])

  useEffect(() => {
    document.title = 'The Haggis Kirkyard'
  }, [])

  return (
    <main className={`gy gy-${view.time}-${view.level}`}>
      <header className="gy-head">
        <a className="gy-back" href="/">
          Back to the glen
        </a>
        <h1>The Haggis Kirkyard</h1>
        <Switcher view={view} onChange={choose} music={music} />
      </header>
      <div className="gy-stage">
        <div className="gy-frame">
          {outgoing && <Picture key={`out-${outgoing.time}-${outgoing.level}`} view={outgoing} fading />}
          <Picture key={`in-${view.time}-${view.level}`} view={view} />
        </div>
      </div>
    </main>
  )
}

function Picture({ view, fading = false }: { view: ViewKey; fading?: boolean }) {
  return (
    <img
      className={fading ? 'gy-img gy-img-out' : 'gy-img gy-img-in'}
      src={viewSrc(view, 1600)}
      srcSet={`${viewSrc(view, 1600)} 1600w, ${viewSrc(view, 2400)} 2400w`}
      sizes="(min-aspect-ratio: 1/1) 80vh, 100vw"
      alt={fading ? '' : viewAlt(view)}
      aria-hidden={fading || undefined}
      width={2400}
      height={2400}
      decoding="async"
      draggable={false}
    />
  )
}

function Switcher({
  view,
  onChange,
  music,
}: {
  view: ViewKey
  onChange: (n: Partial<ViewKey>) => void
  music: { playing: boolean; toggle: () => void }
}) {
  return (
    <div className="gy-switch">
      <Group
        label="Time of day"
        options={TIMES}
        value={view.time}
        onPick={(time) => onChange({ time })}
      />
      <Group
        label="Level"
        options={LEVELS}
        value={view.level}
        onPick={(level) => onChange({ level })}
      />
      <div className="gy-group" role="group" aria-label="Music">
        <button
          type="button"
          className="gy-btn"
          data-music-toggle
          aria-pressed={music.playing}
          onClick={music.toggle}
        >
          {music.playing ? 'Music on' : 'Music off'}
        </button>
      </div>
    </div>
  )
}

function Group<T extends TimeOfDay | Level>({
  label,
  options,
  value,
  onPick,
}: {
  label: string
  options: { id: T; label: string }[]
  value: T
  onPick: (id: T) => void
}) {
  return (
    <div className="gy-group" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          className="gy-btn"
          aria-pressed={o.id === value}
          onClick={() => onPick(o.id)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
