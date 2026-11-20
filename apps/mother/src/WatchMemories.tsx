import { useEffect, useMemo, useState } from 'react'
import {
  carePortraitFor,
  HATCH_FILM_FALLBACK,
  memoryFilmsFor,
  type MemoryFilm,
} from './data/temperaments'

type Props = {
  temperamentId: string
  extras?: MemoryFilm[]
  /** play-film: the 24-hour "playing" film is unlocked. */
  playUnlocked?: boolean
  /** Life stage reached: unlocks stage films. */
  stage?: string
}

export function WatchMemories({ temperamentId, extras = [], playUnlocked = false, stage }: Props) {
  const films = useMemo(
    () => memoryFilmsFor(temperamentId, extras, { playUnlocked, stage }),
    [temperamentId, extras, playUnlocked, stage],
  )
  const [selectedId, setSelectedId] = useState(films[0]?.id ?? '')
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [src, setSrc] = useState(() => films[0]?.src ?? HATCH_FILM_FALLBACK)

  // Newest film is the default; switch to it when a new one unlocks while open.
  const newestId = films[0]?.id ?? ''
  useEffect(() => {
    setSelectedId(newestId)
    setPlayingId(null)
  }, [newestId])

  const selected = films.find((f) => f.id === selectedId) ?? films[0]
  const playing = playingId ? films.find((f) => f.id === playingId) : null

  if (films.length === 0) return null

  return (
    <section className="care-watch">
      <h3>Watch again</h3>
      <p className="care-sub">
        Hatch films and growing-up memories live here. Pick one and press play.
      </p>
      <div className="watch-row">
        <label className="watch-select">
          <span className="visually-hidden">Choose a film</span>
          <select
            value={selected?.id ?? ''}
            onChange={(e) => {
              setSelectedId(e.target.value)
              setPlayingId(null)
            }}
          >
            {films.map((film) => (
              <option key={film.id} value={film.id}>
                {film.title}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="btn btn-ghost"
          disabled={!selected}
          onClick={() => {
            if (!selected) return
            setSrc(selected.src)
            setPlayingId(selected.id)
          }}
        >
          Watch
        </button>
      </div>

      {playing ? (
        <div className="watch-player">
          <p className="watch-now-playing">{playing.title}</p>
          <video
            key={`${playing.id}-${src}`}
            className="watch-film"
            controls
            autoPlay
            playsInline
            poster={carePortraitFor(temperamentId)}
            onError={() => {
              if (src !== HATCH_FILM_FALLBACK) setSrc(HATCH_FILM_FALLBACK)
            }}
          >
            <source src={src} type="video/mp4" />
          </video>
          <button
            type="button"
            className="btn btn-ghost watch-close"
            onClick={() => setPlayingId(null)}
          >
            Close
          </button>
        </div>
      ) : null}
    </section>
  )
}
