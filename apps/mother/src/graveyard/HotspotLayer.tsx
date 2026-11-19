import { useState } from 'react'
import { centre, pointsAttr, type Hotspot } from './hotspots'

/**
 * Clickable shapes over the painting. The SVG has the same square shape as the picture,
 * so a point of (50, 50) is always the middle of it.
 * Each shape is a real button for keyboard and screen reader users.
 */
export function HotspotLayer({
  hotspots,
  onOpen,
  showAll = false,
}: {
  hotspots: Hotspot[]
  onOpen: (id: string) => void
  /** Developer view: outline every shape. */
  showAll?: boolean
}) {
  const [active, setActive] = useState<string | null>(null)
  const current = hotspots.find((h) => h.id === active)
  const [lx, ly] = current ? centre(current.points) : [0, 0]

  return (
    <>
      <svg
        className={showAll ? 'gy-hot gy-hot-all' : 'gy-hot'}
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-label="Places to explore"
      >
        {hotspots.map((h) => {
          return (
            <g key={h.id} className={`gy-k-${h.kind}`}>
              <polygon
                className={h.id === active ? 'gy-hot-shape gy-on' : 'gy-hot-shape'}
                points={pointsAttr(h.points)}
                role="button"
                tabIndex={0}
                aria-label={h.title}
                onClick={() => onOpen(h.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onOpen(h.id)
                  }
                }}
                onPointerEnter={() => setActive(h.id)}
                onPointerLeave={() => setActive((a) => (a === h.id ? null : a))}
                onFocus={() => setActive(h.id)}
                onBlur={() => setActive((a) => (a === h.id ? null : a))}
              />
            </g>
          )
        })}
      </svg>
      {current && (
        <span
          className={`gy-hot-label gy-k-${current.kind}`}
          style={{ left: `${lx}%`, top: `${ly}%` }}
          aria-hidden="true"
        >
          {current.title}
        </span>
      )}
    </>
  )
}
