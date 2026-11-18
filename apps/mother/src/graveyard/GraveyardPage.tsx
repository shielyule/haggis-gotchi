import { useEffect, useState } from 'react'
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

/**
 * graveyard-3d, Tier A: the painted kirkyard with a Day/Night and Above/Below switch.
 * Only the current and the outgoing picture are in the page, so memory stays small.
 */
export default function GraveyardPage() {
  const [view, setView] = useState<ViewKey>(() => readViewFromSearch(window.location.search))
  const [outgoing, setOutgoing] = useState<ViewKey | null>(null)

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
        <Switcher view={view} onChange={choose} />
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

function Switcher({ view, onChange }: { view: ViewKey; onChange: (n: Partial<ViewKey>) => void }) {
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
