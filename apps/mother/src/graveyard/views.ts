/** The four painted views of the kirkyard. File names: `<level>-<time>-<width>.webp` in /graveyard/. */
export type TimeOfDay = 'day' | 'night'
export type Level = 'above' | 'below'
export type ViewKey = { time: TimeOfDay; level: Level }

export const TIMES: { id: TimeOfDay; label: string }[] = [
  { id: 'day', label: 'Day' },
  { id: 'night', label: 'Night' },
]
export const LEVELS: { id: Level; label: string }[] = [
  { id: 'above', label: 'Above ground' },
  { id: 'below', label: 'Below ground' },
]

const ALT: Record<Level, Record<TimeOfDay, string>> = {
  above: {
    day: 'The Haggis kirkyard by day: a mossy hillside of crooked stones, a small kirk and a ruined chapel, pine forest behind, terraced graves below.',
    night: 'The Haggis kirkyard by night under a crescent moon: mist, a glowing kirk window and the terraced graves below.',
  },
  below: {
    day: 'Cutaway of the kirkyard by day: roots, burrows, coffins and hoards of oats beneath the graves.',
    night: 'Cutaway of the kirkyard by night: glowing blue fungi and spirit wisps in the tunnels beneath the graves.',
  },
}

export function viewAlt(v: ViewKey): string {
  return ALT[v.level][v.time]
}

export function viewSrc(v: ViewKey, width: 1600 | 2400): string {
  return `/graveyard/${v.level}-${v.time}-${width}.webp`
}

export const DEFAULT_VIEW: ViewKey = { time: 'day', level: 'above' }

/** Reads `?time=night&level=below`. Anything else falls back to the default. */
export function readViewFromSearch(search: string): ViewKey {
  const p = new URLSearchParams(search)
  const time = p.get('time')
  const level = p.get('level')
  return {
    time: time === 'night' || time === 'day' ? time : DEFAULT_VIEW.time,
    level: level === 'below' || level === 'above' ? level : DEFAULT_VIEW.level,
  }
}
