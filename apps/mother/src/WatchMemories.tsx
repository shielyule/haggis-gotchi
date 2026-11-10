import { useMemo, useState } from 'react'
import {
  HATCH_FILM_FALLBACK,
  memoryFilmsFor,
  type MemoryFilm,
} from './data/temperaments'

type Props = {
  temperamentId: string
  extras?: MemoryFilm[]
}

export function WatchMemories({ temperamentId, extras = [] }: Props) {
  const films = useMemo(
    () => memoryFilmsFor(temperamentId, extras),
    [temperamentId, extras],
  )
  const [selectedId, setSelectedId] = useState(films[0]?.id ?? '')
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [src, setSrc] = useState(() => films[0]?.src ?? HATCH_FILM_FALLBACK)

  const selected = films.find((f) => f.id === selectedId) ?? films[0]
  const playing = playingId ? films.find((f) => f.id === playingId) : null

  if (films.length === 0) return null

  return (
    <section className="care-watch">
      <h3>Watch again</h3>
      <p className="care-sub">
        Hatch films and later memories live here. Pick one and press play.
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
            poster="/art/haggis-hero.jpg"
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
