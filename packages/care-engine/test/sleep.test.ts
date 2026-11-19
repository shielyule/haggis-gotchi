// Owner feature 19 Nov: Put to bed for 8 hours; woken early by feed/walk/treat = grumpy.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { applyCare, tick } from '../src/tick.ts'
import type { Haggling } from '../src/types.ts'

const T0 = new Date()
T0.setHours(14, 0, 0, 0) // afternoon: no meal/bed window crossed in the first hours
const START = T0.getTime()
const at = (h: number) => ({ temperamentId: 'ill-trickit', nowMs: START + h * 3_600_000 })

const fresh = (): Haggling => ({
  eggId: 'e', name: 'Snoozy', breakfastHour: 8, dinnerHour: 18, bedHour: 22,
  hunger: 80, mood: 60, energy: 30, mess: 10, healthXp: 50,
  lastTickAt: new Date(START).toISOString(), scrapbook: [], livingOn: 'phone',
})

test('put to bed: asleep for 8 hours', () => {
  const h = applyCare(fresh(), 'sleep', at(0)).haggling
  assert.equal(Date.parse(h.asleepUntil!), START + 8 * 3_600_000)
  assert.match(h.scrapbook[0].text, /tucked in/)
})

test('asleep: energy recovers, hunger slows, mood holds; wakes rested after 8 hours', () => {
  const bed = applyCare(fresh(), 'sleep', at(0)).haggling
  const mid = tick(bed, at(4)).haggling
  assert.ok(mid.energy > bed.energy, 'energy recovers while asleep')
  assert.equal(mid.mood, bed.mood, 'no mood decay while asleep')
  assert.equal(mid.hunger, 62) // 80 - 4h * 9 * 0.5
  assert.ok(mid.asleepUntil, 'still asleep at 4 hours')
  const woke = tick(mid, at(8.5)).haggling
  assert.equal(woke.asleepUntil, undefined)
  assert.ok(woke.mood > mid.mood, 'wakes in a good mood')
  assert.match(woke.scrapbook[0].text, /bright-eyed/)
})

test('fed, walked or given a treat while asleep: wakes grumpy', () => {
  for (const action of ['feed', 'walk', 'treat'] as const) {
    const bed = applyCare(fresh(), 'sleep', at(0)).haggling
    const r = applyCare(bed, action, at(2)).haggling
    assert.equal(r.asleepUntil, undefined, action)
    assert.ok(r.scrapbook.some((s) => /crabbit/.test(s.text)), action)
  }
})

test('cuddle and clean do not wake it', () => {
  for (const action of ['cuddle', 'clean'] as const) {
    const bed = applyCare(fresh(), 'sleep', at(0)).haggling
    const r = applyCare(bed, action, at(2)).haggling
    assert.ok(r.asleepUntil, action)
  }
})
