/**
 * Seasonal costumes (owner, 23 Nov 2026). Pure: no browser APIs, tested under node.
 * Spec: .kiro/specs/seasonal-costumes
 */
/** Month 1-12, day 1-31. */
export type MonthDay = { month: number; day: number }

export type Season = {
  id: string
  label: string
  emoji: string
  /** Inclusive. If `from` is after `to`, the window runs over New Year. */
  from: MonthDay
  to: MonthDay
  /** art[stage][temperament] = image path. Missing = normal portrait. */
  art: Record<string, Record<string, string>>
}

const TEMPS = ['douce', 'skeigh', 'ill-trickit', 'ree', 'radge', 'fair-wud']
const artFor = (stage: string, season: string) =>
  Object.fromEntries(TEMPS.map((t) => [t, `/art/haggling-${stage}-${season}-${t}.jpeg`]))

/** Add St Andrew's Day, Christmas, Burns Night and Easter here when the art and dates land. */
export const SEASONS: Season[] = [
  {
    id: 'halloween',
    label: 'Halloween',
    emoji: '🎃',
    from: { month: 10, day: 15 },
    to: { month: 11, day: 1 },
    art: { child: artFor('child', 'halloween') },
  },
]

const key = (md: MonthDay) => md.month * 100 + md.day

/** R1.3: inclusive, and wraps over New Year when `from` is after `to`. */
export function inWindow(md: MonthDay, from: MonthDay, to: MonthDay): boolean {
  const k = key(md)
  return key(from) <= key(to) ? k >= key(from) && k <= key(to) : k >= key(from) || k <= key(to)
}

/** The carer's local month and day for a moment. */
export function monthDayOf(nowMs: number): MonthDay {
  const d = new Date(nowMs)
  return { month: d.getMonth() + 1, day: d.getDate() }
}

export function seasonFor(md: MonthDay, seasons: Season[] = SEASONS): Season | null {
  return seasons.find((s) => inWindow(md, s.from, s.to)) ?? null
}

/**
 * The costume to show, if any (R1.1, R3.2). `preview` = a season id from the demo menu,
 * 'off' or null.
 */
export function costumeFor(
  temperamentId: string,
  stage: string,
  md: MonthDay,
  preview: string | null = null,
  seasons: Season[] = SEASONS,
): { src: string; season: Season } | null {
  const season = preview && preview !== 'off' ? seasons.find((s) => s.id === preview) ?? null : seasonFor(md, seasons)
  const src = season?.art[stage]?.[temperamentId]
  return season && src ? { src, season } : null
}

/** Costume if one applies, else `normal` (the stage portrait) (R1.2). */
export function portraitFor(temperamentId: string, stage: string, md: MonthDay, preview: string | null, normal: string): string {
  return costumeFor(temperamentId, stage, md, preview)?.src ?? normal
}

/** Demo preview (R3): stored on the device; `?costume=` sets it. Browser only. */
const PREVIEW_KEY = 'haggis-gotchi:costume-preview'
export function costumePreview(): string | null {
  try {
    const q = new URLSearchParams(window.location.search).get('costume')
    if (q) {
      if (q === 'off') localStorage.removeItem(PREVIEW_KEY)
      else if (SEASONS.some((s) => s.id === q)) localStorage.setItem(PREVIEW_KEY, q)
    }
    return localStorage.getItem(PREVIEW_KEY)
  } catch {
    return null
  }
}
export function setCostumePreview(id: string | null): void {
  try {
    if (id) localStorage.setItem(PREVIEW_KEY, id)
    else localStorage.removeItem(PREVIEW_KEY)
  } catch {
    // ignore
  }
}
