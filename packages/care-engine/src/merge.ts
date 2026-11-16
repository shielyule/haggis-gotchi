import { RULES } from './rules.ts'
import type { Haggling, MemoryFilm, ScrapEntry } from './types.ts'

/** Unparseable or missing timestamps count as "oldest possible". */
export function timeOf(iso: string | undefined): number {
  const n = iso ? Date.parse(iso) : Number.NaN
  return Number.isFinite(n) ? n : 0
}

function unionById<T extends { id: string }>(local: T[] = [], remote: T[] = []): T[] {
  const byId = new Map<string, T>()
  for (const item of local) byId.set(item.id, item)
  for (const item of remote) byId.set(item.id, item) // same id: cloud copy wins
  return [...byId.values()]
}

function unionStrings(a: string[] = [], b: string[] = []): string[] {
  return [...new Set([...a, ...b])].sort()
}

/**
 * Merge a local snapshot with the cloud snapshot of the SAME Haggling.
 * Spec: .kiro/specs/sync-conflict (R3, R4, R6).
 *
 * 1. Meter block (hunger, mood, energy, mess, healthXp, sick, penalty clocks and
 *    flags, lastTickAt, lastFeedAt, lastBedAt, lastCleanAt) comes WHOLE from the
 *    snapshot with the later lastTickAt. Equal timestamps: the cloud wins.
 * 2. Identity and schedule (eggId, name, cloudChildId, meal and bed hours) always
 *    come from the cloud: traits are immutable once hatched.
 * 3. Hand-off state (livingOn, transferCode) comes from the cloud, because the
 *    cloud performs the hand-off and may have cleared the code.
 * 4. Scrapbook, memory films and applied weather slots are unions, so nothing
 *    either surface recorded is lost.
 *
 * Merge first, then tick forward to now so offline decay is applied exactly once.
 */
export function mergeHaggling(local: Haggling, remote: Haggling): Haggling {
  const winner = timeOf(remote.lastTickAt) >= timeOf(local.lastTickAt) ? remote : local
  const out = structuredClone(winner)

  out.eggId = remote.eggId
  out.name = remote.name
  out.breakfastHour = remote.breakfastHour
  out.dinnerHour = remote.dinnerHour
  out.bedHour = remote.bedHour

  const childId = remote.cloudChildId ?? local.cloudChildId
  if (childId !== undefined) out.cloudChildId = childId

  out.livingOn = remote.livingOn
  if (remote.transferCode !== undefined) out.transferCode = remote.transferCode
  else delete out.transferCode
  const sent = remote.sentToPhoneAt ?? local.sentToPhoneAt
  if (sent !== undefined) out.sentToPhoneAt = sent
  else delete out.sentToPhoneAt

  const scraps: ScrapEntry[] = unionById(local.scrapbook, remote.scrapbook)
  scraps.sort((x, y) => timeOf(y.at) - timeOf(x.at) || (x.id < y.id ? -1 : 1))
  out.scrapbook = scraps.slice(0, RULES.scrapbookMax)

  if (local.memoryFilms || remote.memoryFilms) {
    out.memoryFilms = unionById<MemoryFilm>(local.memoryFilms, remote.memoryFilms)
  }
  if (local.weatherApplied || remote.weatherApplied) {
    out.weatherApplied = unionStrings(local.weatherApplied, remote.weatherApplied)
  }

  return out
}
