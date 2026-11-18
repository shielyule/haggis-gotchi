/**
 * Life stages and departure. Pure, shared by phone and server.
 * Spec: .kiro/specs/lifespan-graveyard v2 (R1, R3) - 6-week life (owner, 18 Nov).
 */
export const LIFESPAN_DAYS = 42
const DAY = 86_400_000

export type StageId = 'baby' | 'child' | 'teen' | 'adult' | 'elder'

export const STAGES: { id: StageId; label: string; fromDay: number }[] = [
  { id: 'baby', label: 'Baby', fromDay: 0 },
  { id: 'child', label: 'Child', fromDay: 7 },
  { id: 'teen', label: 'Teen', fromDay: 14 },
  { id: 'adult', label: 'Adult', fromDay: 24 },
  { id: 'elder', label: 'Old age', fromDay: 36 },
]

export type LifeStatus = {
  stage: StageId
  label: string
  /** Whole days since birth (0 on hatch day). */
  day: number
  /** Whole days left, at least 0. */
  daysLeft: number
  departed: boolean
}

export function lifeStatus(bornAt: string | undefined, spanEndsAt: string | undefined, nowMs: number, departedAt?: string): LifeStatus {
  const born = bornAt ? Date.parse(bornAt) : nowMs
  const ends = spanEndsAt ? Date.parse(spanEndsAt) : born + LIFESPAN_DAYS * DAY
  const day = Math.max(0, Math.floor((nowMs - born) / DAY))
  const s = [...STAGES].reverse().find((x) => day >= x.fromDay) ?? STAGES[0]
  return {
    stage: s.id,
    label: s.label,
    day,
    daysLeft: Math.max(0, Math.ceil((ends - nowMs) / DAY)),
    departed: Boolean(departedAt) || nowMs >= ends,
  }
}

export type Tone = 'bright' | 'dim' | 'dark'

/** R3: average mood -> tone. Boundaries pinned by tests (60 / 35). */
export function toneFor(avgMood: number): Tone {
  if (avgMood >= 60) return 'bright'
  if (avgMood >= 35) return 'dim'
  return 'dark'
}

const EPITAPHS: Record<Tone, string[]> = {
  bright: [
    '{name} lived loud and was loved. {days} days of mischief in the heather.',
    '{name}: fed, cuddled, rained on, adored. {days} grand days.',
  ],
  dim: [
    '{name} had good days and dreich days. {days} days, and the rain was always welcome.',
    '{name} waited by the window more than most. Still loved, all {days} days.',
  ],
  dark: [
    '{name} mostly remembered the weather. {days} quiet days.',
    '{name} kept the faith through {days} long days. Somebody should have visited more.',
  ],
}

/** Epitaph on the headstone. Deterministic per name, so phone and server agree. */
export function epitaph(name: string, tone: Tone, daysLived: number): string {
  const list = EPITAPHS[tone]
  let h = 0
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return list[h % list.length].replace(/\{name\}/g, name).replace(/\{days\}/g, String(daysLived))
}
