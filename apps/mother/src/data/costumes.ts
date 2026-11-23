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

/** Dates from the owner (23 Nov 2026). Easter is fixed at 24 Mar - 1 Apr every year (owner). */
export const SEASONS: Season[] = [
  {
    id: 'halloween',
    label: 'Halloween',
    emoji: '🎃',
    from: { month: 10, day: 15 },
    to: { month: 11, day: 1 },
    art: { child: artFor('child', 'halloween') },
  },
  {
    id: 'st-andrews',
    label: "St Andrew's Day",
    emoji: '\u{1F3F4}\u{E0067}\u{E0062}\u{E0073}\u{E0063}\u{E0074}\u{E007F}', // Scotland flag
    from: { month: 11, day: 28 },
    to: { month: 12, day: 1 },
    art: { child: artFor('child', 'st-andrews') },
  },
  {
    id: 'christmas',
    label: 'Christmas',
    emoji: '🎄',
    from: { month: 12, day: 10 },
    to: { month: 1, day: 1 }, // runs over New Year
    art: { child: artFor('child', 'christmas') },
  },
  {
    id: 'burns-night',
    label: 'Burns Night',
    emoji: '🌹', // "My love is like a red, red rose"
    from: { month: 1, day: 20 },
    to: { month: 1, day: 27 },
    art: { child: artFor('child', 'burns-night') },
  },
  {
    id: 'easter',
    label: 'Easter',
    emoji: '🐣',
    from: { month: 3, day: 24 },
    to: { month: 4, day: 1 },
    art: { child: artFor('child', 'easter') },
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
