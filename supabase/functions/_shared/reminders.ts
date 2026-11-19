/**
 * Which reminders are due right now. Pure: tested under node, used by care-reminders.
 * Spec: .kiro/specs/care-reminders (R2-R5)
 */
import { tick, type Haggling } from '../../../packages/care-engine/src/index.ts'

export type ChildRow = {
  id: string
  name: string
  temperament_id: string
  breakfast_hour: number
  dinner_hour: number
  bed_hour: number
  hunger: number
  mood: number
  energy: number
  mess: number
  health_xp: number | null
  last_tick_at: string
  asleep_until?: string | null
}

export type Reminder = { key: string; title: string; body: string }

/** Hour (0-23) and date (YYYY-MM-DD) in an IANA timezone. Falls back to Europe/London. */
export function localClock(timezone: string, nowMs: number): { hour: number; date: string } {
  const fmt = (tz: string) =>
    new Intl.DateTimeFormat('en-GB', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(new Date(nowMs))
  let parts
  try {
    parts = fmt(timezone)
  } catch {
    parts = fmt('Europe/London')
  }
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '00'
  return { hour: Number(get('hour')) % 24, date: `${get('year')}-${get('month')}-${get('day')}` }
}

/** Meters projected to now with the shared care engine (same rules as the phone). */
export function projectedBars(row: ChildRow, nowMs: number) {
  const h: Haggling = {
    eggId: '',
    name: row.name,
    breakfastHour: row.breakfast_hour,
    dinnerHour: row.dinner_hour,
    bedHour: row.bed_hour,
    hunger: row.hunger,
    mood: row.mood,
    energy: row.energy,
    mess: row.mess,
    healthXp: row.health_xp ?? 50,
    lastTickAt: row.last_tick_at,
    asleepUntil: row.asleep_until ?? undefined,
    scrapbook: [],
    livingOn: 'phone',
  }
  const t = tick(h, { temperamentId: row.temperament_id, nowMs }).haggling
  return { hunger: t.hunger, mood: t.mood, energy: t.energy, mess: t.mess }
}

export function dueReminders(row: ChildRow, timezone: string, nowMs: number): Reminder[] {
  const out: Reminder[] = []
  const { hour, date } = localClock(timezone, nowMs)
  const n = row.name

  // Sleep (owner, 19 Nov): quiet while asleep; one "awake" alert when the 8 hours are up.
  const sleepEnd = row.asleep_until ? Date.parse(row.asleep_until) : Number.NaN
  if (Number.isFinite(sleepEnd)) {
    if (nowMs < sleepEnd) return out
    if (nowMs - sleepEnd < 6 * 3_600_000) {
      out.push({ key: `wake:${row.id}:${row.asleep_until}`, title: `${n} is awake!`, body: `${n} slept like a log and is ready for porridge.` })
    }
  }

  const meals: [number, string, string, string][] = [
    [row.breakfast_hour, 'breakfast', `Breakfast for ${n}`, `${n} is sat by the bowl. Porridge time.`],
    [row.dinner_hour, 'dinner', `Dinner for ${n}`, `${n} can smell tatties. Dinner time.`],
    [row.bed_hour, 'bedtime', `Bedtime for ${n}`, `${n} is yawning. A bedtime cuddle, please.`],
  ]
  for (const [h, kind, title, body] of meals) {
    if (h === hour) out.push({ key: `meal:${row.id}:${kind}:${date}`, title, body })
  }

  // Re-armed by care: any care action changes last_tick_at, which changes the key.
  const bars = projectedBars(row, nowMs)
  const empty: [boolean, string, string][] = [
    [bars.hunger <= 0, 'hunger', `${n} is starving. Feed them before it costs Health XP.`],
    [bars.mood <= 0, 'mood', `${n} is in a right huff. A cuddle would help.`],
    [bars.energy <= 0, 'energy', `${n} is wabbit (worn out). Time for bed.`],
    [bars.mess >= 100, 'mess', `${n}'s corner is clarty. Time for a clean.`],
  ]
  for (const [hit, bar, body] of empty) {
    if (hit) out.push({ key: `empty:${row.id}:${bar}:${row.last_tick_at}`, title: `${n} needs you`, body })
  }
  return out
}
