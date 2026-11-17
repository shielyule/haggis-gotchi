/**
 * When growth films unlock. Pure, shared by the app and the reminder job.
 * Spec: .kiro/specs/play-film (R3, R4)
 */
export const PLAY_FILM_DELAY_MS = 24 * 60 * 60 * 1000
export const PLAY_FILM_DEMO_DELAY_MS = 3 * 60 * 1000
/** An egg claimed with the demo wait (90 s) has a wait of 2 minutes or less. */
export const DEMO_WAIT_MAX_MS = 2 * 60 * 1000

export function isDemoEgg(createdAt: string, readyAt: string): boolean {
  const wait = Date.parse(readyAt) - Date.parse(createdAt)
  return Number.isFinite(wait) && wait <= DEMO_WAIT_MAX_MS
}

/** Time the playing film unlocks, or null if the hatch time is unknown. */
export function playFilmUnlockAt(hatchedAt: string | undefined, demo: boolean): number | null {
  const t = hatchedAt ? Date.parse(hatchedAt) : Number.NaN
  if (!Number.isFinite(t)) return null
  return t + (demo ? PLAY_FILM_DEMO_DELAY_MS : PLAY_FILM_DELAY_MS)
}

export function isPlayFilmUnlocked(hatchedAt: string | undefined, demo: boolean, nowMs: number): boolean {
  const at = playFilmUnlockAt(hatchedAt, demo)
  return at !== null && nowMs >= at
}
