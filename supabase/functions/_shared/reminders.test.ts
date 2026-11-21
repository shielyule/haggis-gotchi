// Spec: .kiro/specs/care-reminders T3
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { dailySlotKeys, dueReminders, isQuietHour, localClock, QUIET_DAILY_CAP, type ChildRow } from './reminders.ts'

const row = (over: Partial<ChildRow> = {}): ChildRow => ({
  id: 'c1', name: 'Wee Yin', temperament_id: 'douce',
  breakfast_hour: 8, dinner_hour: 18, bed_hour: 21,
  hunger: 80, mood: 80, energy: 80, mess: 10, health_xp: 50,
  last_tick_at: '2026-11-17T07:55:00Z', ...over,
})

test('localClock uses the carer timezone (London is UTC in November)', () => {
  const t = Date.parse('2026-11-17T08:10:00Z')
  assert.deepEqual(localClock('Europe/London', t), { hour: 8, date: '2026-11-17' })
  assert.deepEqual(localClock('Asia/Tokyo', t), { hour: 17, date: '2026-11-17' })
  assert.deepEqual(localClock('Not/AZone', t), { hour: 8, date: '2026-11-17' })
})

test('breakfast reminder at the breakfast hour, keyed per day', () => {
  const r = dueReminders(row(), 'Europe/London', Date.parse('2026-11-17T08:10:00Z'))
  assert.equal(r.length, 1)
  assert.equal(r[0].key, 'meal:c1:breakfast:2026-11-17')
  assert.match(r[0].body, /Porridge/)
})

test('no meal reminder outside the hour', () => {
  assert.equal(dueReminders(row(), 'Europe/London', Date.parse('2026-11-17T10:10:00Z')).length, 0)
})

test('same moment in another timezone gives a different (correct) meal', () => {
  const r = dueReminders(row(), 'Asia/Tokyo', Date.parse('2026-11-17T09:10:00Z')) // 18:10 Tokyo
  assert.deepEqual(r.map((x) => x.key), ['meal:c1:dinner:2026-11-17'])
})

test('empty bars: projected with the care engine, keyed by last_tick_at', () => {
  // 20 hours without care: hunger 80 - 9*20 < 0, mess 10 + 5*20 >= 100
  const r = dueReminders(row(), 'Europe/London', Date.parse('2026-11-18T03:55:00Z'))
  const keys = r.map((x) => x.key)
  assert.ok(keys.includes('empty:c1:hunger:2026-11-17T07:55:00Z'))
  assert.ok(keys.includes('empty:c1:mess:2026-11-17T07:55:00Z'))
})

test('a fresh care action re-arms (new last_tick_at gives a new key)', () => {
  const a = dueReminders(row({ hunger: 0 }), 'Europe/London', Date.parse('2026-11-17T08:30:00Z'))
  const b = dueReminders(row({ hunger: 0, last_tick_at: '2026-11-17T08:20:00Z' }), 'Europe/London', Date.parse('2026-11-17T08:30:00Z'))
  const ka = a.find((x) => x.key.includes('hunger'))?.key
  const kb = b.find((x) => x.key.includes('hunger'))?.key
  assert.ok(ka && kb && ka !== kb)
})

test('asleep: no reminders until the 8 hours are up, then one wake alert', () => {
  const bed = row({ asleep_until: '2026-11-17T16:00:00Z', breakfast_hour: 8 })
  assert.equal(dueReminders(bed, 'Europe/London', Date.parse('2026-11-17T08:10:00Z')).length, 0) // breakfast hour, asleep
  const r = dueReminders(bed, 'Europe/London', Date.parse('2026-11-17T16:05:00Z'))
  assert.ok(r.some((x) => x.key === 'wake:c1:2026-11-17T16:00:00Z'))
})

test('quiet nights: 22:00 to 06:59 is quiet, 07:00 to 21:59 is not; six slots a day', () => {
  for (const h of [22, 23, 0, 3, 6]) assert.equal(isQuietHour(h), true, `hour ${h}`)
  for (const h of [7, 8, 12, 21]) assert.equal(isQuietHour(h), false, `hour ${h}`)
  const slots = dailySlotKeys('carer-1', '2026-11-22')
  assert.equal(slots.length, QUIET_DAILY_CAP)
  assert.equal(QUIET_DAILY_CAP, 6)
  assert.equal(slots[0], 'cap:carer-1:2026-11-22:1')
  assert.equal(new Set(slots).size, 6)
})
test('two days left: once (keyed per Haggling), only inside the last 48 hours', () => {
  const now = Date.parse('2026-11-17T10:10:00Z')
  const at = (h: number) => new Date(now + h * 3_600_000).toISOString()
  const find = (span: string | null) =>
    dueReminders(row({ span_ends_at: span }), 'Europe/London', now).find((r) => r.key.startsWith('twodays:'))
  assert.equal(find(at(49)), undefined)
  assert.equal(find(at(47))?.key, 'twodays:c1')
  assert.match(find(at(47))?.title ?? '', /two days left/)
  assert.equal(find(at(-1)), undefined)
  assert.equal(find(null), undefined)
})
