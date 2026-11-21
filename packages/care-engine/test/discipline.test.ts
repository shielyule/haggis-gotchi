// Owner 22 Nov: Scold (fair vs unfair) and the Haggis Run mini-game.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { applyCare, isMisbehaving } from '../src/tick.ts'
import type { Haggling } from '../src/types.ts'

const T0 = new Date()
T0.setHours(14, 0, 0, 0)
const START = T0.getTime()
const fresh = (eggId = 'e'): Haggling => ({
  eggId, name: 'Wee Yin', breakfastHour: 8, dinnerHour: 18, bedHour: 22,
  hunger: 60, mood: 60, energy: 60, mess: 10, healthXp: 50,
  lastTickAt: new Date(START).toISOString(), scrapbook: [], livingOn: 'phone',
})

/** Find an hour where this Haggling is / is not misbehaving (deterministic). */
function hourWhere(want: boolean, temperamentId = 'radge'): number {
  for (let i = 0; i < 500; i++) {
    const t = START + i * 3_600_000
    if (isMisbehaving(fresh(), temperamentId, t) === want) return t
  }
  throw new Error('no hour found')
}

test('wild temperaments misbehave more often than douce', () => {
  const count = (t: string) => Array.from({ length: 1000 }, (_, i) => isMisbehaving(fresh(), t, START + i * 3_600_000)).filter(Boolean).length
  assert.ok(count('fair-wud') > count('douce') * 3)
})

test('fair scold: small mood dip, mischief stops this hour, Health XP kept', () => {
  const t = hourWhere(true)
  const r = applyCare({ ...fresh(), lastTickAt: new Date(t).toISOString() }, 'scold', { temperamentId: 'radge', nowMs: t }).haggling
  assert.equal(r.healthXp, 50)
  assert.equal(isMisbehaving(r, 'radge', t), false)
  assert.match(r.scrapbook[0].text, /Lesson learned/)
})

test('unfair scold: bigger mood dip and Health XP -3; Life XP never drops', () => {
  const t = hourWhere(false)
  const start = { ...fresh(), lifeXp: 40, lastTickAt: new Date(t).toISOString() }
  const r = applyCare(start, 'scold', { temperamentId: 'radge', nowMs: t }).haggling
  assert.equal(r.healthXp, 47)
  assert.ok((r.lifeXp ?? 0) >= 40)
  assert.match(r.scrapbook[0].text, /for nothing/)
})

test('Haggis Run: mood +4 per win (max 5), costs energy', () => {
  const r = applyCare({ ...fresh(), playScore: 4 }, 'play', { temperamentId: 'douce', nowMs: START }).haggling
  assert.ok(r.mood >= 60 + 16 - 1)
  assert.ok(r.energy < 60)
  assert.equal(r.playScore, undefined)
  const capped = applyCare({ ...fresh(), playScore: 99 }, 'play', { temperamentId: 'douce', nowMs: START }).haggling
  assert.ok(capped.mood <= 60 + 20 + 1)
})
