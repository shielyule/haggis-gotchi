import raw from './hotspots.json'
import type { Level, TimeOfDay, ViewKey } from './views'

/** `above-day`, `below-night`, ... Same words as the image file names. */
export type ViewId = `${Level}-${TimeOfDay}`
export type Point = [number, number]
/** Pin colour group: history = gold, legend = emerald (famous Haggis), spooky = cyan (superstitions, underground). */
export type Kind = 'history' | 'legend' | 'spooky'
export const KINDS: Kind[] = ['history', 'legend', 'spooky']

/**
 * One clickable area on the painting.
 * `points` are percentages of the picture (0 to 100, left to right and top to bottom),
 * so the shape stays in place at any screen size.
 * `lore` is plain text. A blank line starts a new paragraph. No HTML.
 * `image`, `video` and `poster` are files under /graveyard/.
 */
export type Hotspot = {
  id: string
  title: string
  views: 'all' | ViewId[]
  kind: Kind
  points: Point[]
  lore: string
  image?: string
  imageAlt?: string
  video?: string
  poster?: string
}

const VIEW_IDS: ViewId[] = ['above-day', 'above-night', 'below-day', 'below-night']

export function viewId(v: ViewKey): ViewId {
  return `${v.level}-${v.time}`
}

const isRecord = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null

function cleanPoint(p: unknown): Point | null {
  if (!Array.isArray(p) || p.length !== 2) return null
  const [x, y] = p
  if (typeof x !== 'number' || typeof y !== 'number' || !Number.isFinite(x) || !Number.isFinite(y)) {
    return null
  }
  return [Math.min(100, Math.max(0, x)), Math.min(100, Math.max(0, y))]
}

/** Only first-party files under /graveyard/ are allowed, never another site. */
function cleanPath(p: unknown): string | undefined {
  if (typeof p !== 'string') return undefined
  return /^\/graveyard\/[\w./-]+$/.test(p) && !p.includes('..') ? p : undefined
}

/**
 * Hand-edited JSON goes through here. A bad entry is skipped (and named in the console
 * while developing) instead of breaking the page.
 */
export function cleanHotspots(input: unknown): Hotspot[] {
  if (!Array.isArray(input)) return []
  const seen = new Set<string>()
  const out: Hotspot[] = []
  for (const item of input) {
    const bad = (why: string) => {
      if (import.meta.env.DEV) console.warn(`[graveyard] hotspot skipped: ${why}`, item)
    }
    if (!isRecord(item)) {
      bad('not an object')
      continue
    }
    const id = typeof item.id === 'string' ? item.id.trim() : ''
    if (!/^[a-z0-9-]+$/.test(id)) {
      bad('id must be lower case letters, numbers and dashes')
      continue
    }
    if (seen.has(id)) {
      bad('duplicate id')
      continue
    }
    const points = (Array.isArray(item.points) ? item.points : [])
      .map(cleanPoint)
      .filter((p): p is Point => p !== null)
    if (points.length < 3) {
      bad('needs at least 3 points')
      continue
    }
    const title = typeof item.title === 'string' ? item.title.trim().slice(0, 80) : ''
    if (!title) {
      bad('needs a title')
      continue
    }
    const views =
      item.views === undefined || item.views === 'all'
        ? 'all'
        : Array.isArray(item.views)
          ? item.views.filter((v): v is ViewId => VIEW_IDS.includes(v as ViewId))
          : []
    if (views !== 'all' && views.length === 0) {
      bad('views must be "all" or a list of above-day, above-night, below-day, below-night')
      continue
    }
    seen.add(id)
    out.push({
      id,
      title,
      views,
      kind: KINDS.includes(item.kind as Kind) ? (item.kind as Kind) : 'history',
      points,
      lore: typeof item.lore === 'string' ? item.lore.slice(0, 4000) : '',
      image: cleanPath(item.image),
      imageAlt: typeof item.imageAlt === 'string' ? item.imageAlt.slice(0, 200) : undefined,
      video: cleanPath(item.video),
      poster: cleanPath(item.poster),
    })
  }
  return out
}

export const HOTSPOTS: Hotspot[] = cleanHotspots(raw)

export function hotspotsFor(list: Hotspot[], v: ViewKey): Hotspot[] {
  const id = viewId(v)
  return list.filter((h) => h.views === 'all' || h.views.includes(id))
}

/** Middle of the bounding box. Good enough for a marker and a label. */
export function centre(points: Point[]): Point {
  const xs = points.map((p) => p[0])
  const ys = points.map((p) => p[1])
  return [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2]
}

export const pointsAttr = (points: Point[]): string => points.map((p) => p.join(',')).join(' ')
