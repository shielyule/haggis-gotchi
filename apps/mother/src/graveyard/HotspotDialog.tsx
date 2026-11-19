import { useEffect, useRef } from 'react'
import type { Hotspot } from './hotspots'

/**
 * The pop-up. A native <dialog>: the browser traps focus, closes on Escape and gives focus
 * back to the shape that opened it. Order: still image, lore text, then the video at the bottom.
 * The pop-up scrolls. The video loads only when the visitor presses play.
 */
export function HotspotDialog({ hotspot, onClose }: { hotspot: Hotspot; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const d = ref.current
    if (d && !d.open) d.showModal()
  }, [])

  const paragraphs = hotspot.lore.split(/\n\s*\n/).filter((p) => p.trim())

  return (
    <dialog
      ref={ref}
      className={`gy-dialog gy-k-${hotspot.kind}`}
      aria-labelledby="gy-dialog-title"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) ref.current?.close()
      }}
    >
      <div className="gy-dialog-body">
        <button
          type="button"
          className="gy-dialog-x"
          aria-label="Close"
          onClick={() => ref.current?.close()}
        >
          ×
        </button>
        <h2 id="gy-dialog-title">{hotspot.title}</h2>
        {hotspot.image && (
          <img
            className="gy-dialog-media"
            src={hotspot.image}
            alt={hotspot.imageAlt ?? ''}
            decoding="async"
          />
        )}
        {paragraphs.map((p) => (
          <p key={p}>{p}</p>
        ))}
        {hotspot.video && (
          <video
            className="gy-dialog-media gy-dialog-video"
            src={hotspot.video}
            poster={hotspot.poster}
            controls
            playsInline
            preload="none"
          />
        )}
      </div>
    </dialog>
  )
}
