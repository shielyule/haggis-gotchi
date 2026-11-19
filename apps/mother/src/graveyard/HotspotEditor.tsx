import { useState } from 'react'
import { createPortal } from 'react-dom'
import { KINDS, pointsAttr, viewId, type Kind, type Point } from './hotspots'
import type { ViewKey } from './views'

/**
 * DEV ONLY (never in the production build). Open the page with `?edit=1` on the dev server.
 * Click the painting to drop corner points, name the shape, press "Copy JSON", then paste it
 * into the list in `hotspots.json`. All four paintings share one framing, so a shape drawn on
 * one view fits the others.
 */
export default function HotspotEditor({ view }: { view: ViewKey }) {
  const [points, setPoints] = useState<Point[]>([])
  const [title, setTitle] = useState('')
  const [id, setId] = useState('')
  const [thisViewOnly, setThisViewOnly] = useState(false)
  const [kind, setKind] = useState<Kind>('history')
  const [copied, setCopied] = useState(false)

  const slug =
    id.trim() ||
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

  const snippet = JSON.stringify(
    {
      id: slug || 'new-hotspot',
      title: title || 'New hotspot',
      views: thisViewOnly ? [viewId(view)] : 'all',
      kind,
      points,
      lore: 'Write the lore here.',
    },
    null,
    2,
  )

  function addPoint(e: React.MouseEvent<SVGSVGElement>) {
    const r = e.currentTarget.getBoundingClientRect()
    const x = Math.round(((e.clientX - r.left) / r.width) * 1000) / 10
    const y = Math.round(((e.clientY - r.top) / r.height) * 1000) / 10
    setPoints((p) => [...p, [x, y]])
    setCopied(false)
  }

  async function copy() {
    await navigator.clipboard.writeText(snippet + ',')
    setCopied(true)
  }

  return (
    <>
      <svg
        className="gy-edit"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        onClick={addPoint}
        aria-label="Click to add a corner point"
      >
        {points.length >= 3 && <polygon className="gy-edit-fill" points={pointsAttr(points)} />}
        {points.length >= 2 && <polyline className="gy-edit-line" points={pointsAttr(points)} />}
        {points.map(([x, y], i) => (
          <circle key={`${x}-${y}-${i}`} className="gy-edit-pt" cx={x} cy={y} r={0.5} />
        ))}
      </svg>
      {createPortal(
        <aside className="gy-edit-panel" aria-label="Hotspot drawing tool">
          <strong>Hotspot tool (dev only)</strong>
          <p>
            Click the painting to add corners ({points.length} so far, need 3 or more). Existing
            shapes are outlined.
          </p>
          <label>
            Title
            <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} />
          </label>
          <label>
            Id (optional)
            <input value={id} onChange={(e) => setId(e.target.value)} placeholder={slug} />
          </label>
          <label>
            Pin colour
            <select value={kind} onChange={(e) => setKind(e.target.value as Kind)}>
              {KINDS.map((k) => (
                <option key={k} value={k}>
                  {k === 'history' ? 'history (gold)' : k === 'legend' ? 'legend (emerald)' : 'spooky (cyan)'}
                </option>
              ))}
            </select>
          </label>
          <label className="gy-edit-check">
            <input
              type="checkbox"
              checked={thisViewOnly}
              onChange={(e) => setThisViewOnly(e.target.checked)}
            />
            Only this view ({viewId(view)})
          </label>
          <div className="gy-edit-row">
            <button type="button" onClick={() => setPoints((p) => p.slice(0, -1))}>
              Undo
            </button>
            <button type="button" onClick={() => setPoints([])}>
              Clear
            </button>
            <button type="button" onClick={() => void copy()} disabled={points.length < 3}>
              {copied ? 'Copied' : 'Copy JSON'}
            </button>
          </div>
          <pre>{snippet}</pre>
        </aside>,
        document.body,
      )}
    </>
  )
}
