/**
 * The scrapbook book (spec ai-haggling R1, R2). Pure helpers: tested under node.
 */
export const KINDS = ['care', 'diary', 'photo', 'riddle', 'weather', 'milestone'] as const
export type ScrapKind = (typeof KINDS)[number]
export type BookEntry = { id: string; at: string; text: string; kind?: string | null }

const MILESTONE = /(went to the glen|is a (Child|Teen) now|all grown up|getting on now|hatched|chose a new name|tells you who|has something to tell you)/i

/** R1.3: every entry gets exactly one kind. The server's kind wins; older pages are worked out from the words. */
export function scrapKind(e: BookEntry): ScrapKind {
  if (e.kind && (KINDS as readonly string[]).includes(e.kind) && e.kind !== 'care') return e.kind as ScrapKind
  if (/Photo Treat/i.test(e.text)) return 'photo'
  if (/today's riddle/i.test(e.text)) return 'riddle'
  if (MILESTONE.test(e.text)) return 'milestone'
  return 'care'
}

/** Week of life, 1-6 (anything after day 42 counts as week 6). */
export function weekOf(atIso: string, bornIso: string): number {
  const d = Math.floor((Date.parse(atIso) - Date.parse(bornIso)) / 86_400_000)
  if (!Number.isFinite(d)) return 1
  return Math.max(1, Math.min(6, Math.floor(d / 7) + 1))
}

export type Tab = { id: string; label: string }
export const TABS: Tab[] = [
  { id: 'all', label: 'All' },
  { id: 'diary', label: 'Diary' },
  { id: 'photos', label: 'Photos & riddles' },
  ...[1, 2, 3, 4, 5, 6].map((w) => ({ id: `week-${w}`, label: `Week ${w}` })),
]

/** R2.3: the entries on a tab, newest first. */
export function entriesFor(tab: string, entries: BookEntry[], bornIso: string): BookEntry[] {
  const sorted = [...entries].sort((a, b) => Date.parse(b.at) - Date.parse(a.at) || (a.id < b.id ? -1 : 1))
  if (tab === 'diary') return sorted.filter((e) => scrapKind(e) === 'diary')
  if (tab === 'photos') return sorted.filter((e) => ['photo', 'riddle'].includes(scrapKind(e)))
  const m = /^week-(\d)$/.exec(tab)
  if (m) return sorted.filter((e) => weekOf(e.at, bornIso) === Number(m[1]))
  return sorted
}

export const KIND_ICON: Record<ScrapKind, string> = {
  care: '🐾', diary: '📓', photo: '📷', riddle: '❓', weather: '🌦️', milestone: '⭐',
}

/** Pages of a fixed size, for turning. */
export function paginate<T>(items: T[], perPage: number): T[][] {
  const size = Math.max(1, Math.floor(perPage))
  const pages: T[][] = []
  for (let i = 0; i < items.length; i += size) pages.push(items.slice(i, i + size))
  return pages.length ? pages : [[]]
}
