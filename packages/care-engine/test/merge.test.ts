// Run: npm test   (node --test, no dependencies)
// Spec: .kiro/specs/sync-conflict T3 (properties from design section 3)
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mergeHaggling, timeOf } from '../src/merge.ts'
import { applyCare, tick } from '../src/tick.ts'
import type { Haggling, ScrapEntry } from '../src/types.ts'

// ---- tiny deterministic random generator (no dependency) -------------------
function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const BASE = Date.parse('2026-11-16T09:00:00Z')

function genHaggling(r: () => number, idPool: string[]): Haggling {
  const iso = (offsetMin: number) => new Date(BASE + offsetMin * 60_000).toISOString()
  const n = Math.floor(r() * 6)
  const picks = new Set<string>()
  for (let i = 0; i < n; i++) picks.add(idPool[Math.floor(r() * idPool.length)])
  const scrapbook: ScrapEntry[] = [...picks]
    .map((id) => ({ id, at: iso(Math.floor(r() * 600)), text: `line ${id}` }))
    .sort((x, y) => timeOf(y.at) - timeOf(x.at) || (x.id < y.id ? -1 : 1))
  const weather = ['d1-am', 'd1-pm', 'd1-eve', 'd2-am'].filter(() => r() < 0.4)
  return {
    eggId: 'egg-1',
    name: 'Wee Yin',
    cloudChildId: 'child-1',
    breakfastHour: 8,
    dinnerHour: 18,
    bedHour: 22,
    hunger: Math.floor(r() * 101),
    mood: Math.floor(r() * 101),
    energy: Math.floor(r() * 101),
    mess: Math.floor(r() * 101),
    healthXp: Math.floor(r() * 120) - 20,
    lastTickAt: iso(Math.floor(r() * 600)),
    scrapbook,
    livingOn: r() < 0.5 ? 'mother' : 'phone',
    weatherApplied: weather.sort(),
  }
}

const IDS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
const METERS = ['hunger', 'mood', 'energy', 'mess', 'healthXp'] as const

function meters(h: Haggling) {
  return METERS.map((k) => h[k])
}

// ---- properties -------------------------------------------------------------
test('P1 idempotent: merge(a, a) equals a', () => {
  const r = rng(1)
  for (let i = 0; i < 500; i++) {
    const a = genHaggling(r, IDS)
    assert.deepStrictEqual(mergeHaggling(a, a), a)
  }
})

test('P2 newer timestamp wins the WHOLE meter block (cloud and local can swap)', () => {
  const r = rng(2)
  for (let i = 0; i < 500; i++) {
    const a = genHaggling(r, IDS)
    const b = genHaggling(r, IDS)
    if (timeOf(a.lastTickAt) === timeOf(b.lastTickAt)) continue
    const newer = timeOf(a.lastTickAt) > timeOf(b.lastTickAt) ? a : b
    assert.deepStrictEqual(meters(mergeHaggling(a, b)), meters(newer))
    assert.deepStrictEqual(meters(mergeHaggling(b, a)), meters(newer)) // commutative on meters
    assert.equal(mergeHaggling(a, b).lastTickAt, newer.lastTickAt)
  }
})

test('P3 equal timestamps: the cloud (remote) wins', () => {
  const r = rng(3)
  for (let i = 0; i < 300; i++) {
    const local = genHaggling(r, IDS)
    const remote = { ...genHaggling(r, IDS), lastTickAt: local.lastTickAt }
    assert.deepStrictEqual(meters(mergeHaggling(local, remote)), meters(remote))
  }
})

test('P4 result lastTickAt is the max of both', () => {
  const r = rng(4)
  for (let i = 0; i < 300; i++) {
    const a = genHaggling(r, IDS)
    const b = genHaggling(r, IDS)
    const m = mergeHaggling(a, b)
    assert.equal(timeOf(m.lastTickAt), Math.max(timeOf(a.lastTickAt), timeOf(b.lastTickAt)))
  }
})

test('P5 scrapbook is the union of both, newest first, nothing lost', () => {
  const r = rng(5)
  for (let i = 0; i < 500; i++) {
    const a = genHaggling(r, IDS)
    const b = genHaggling(r, IDS)
    const m = mergeHaggling(a, b)
    const want = new Set([...a.scrapbook, ...b.scrapbook].map((s) => s.id))
    assert.deepStrictEqual(new Set(m.scrapbook.map((s) => s.id)), want)
    for (let k = 1; k < m.scrapbook.length; k++) {
      assert.ok(timeOf(m.scrapbook[k - 1].at) >= timeOf(m.scrapbook[k].at))
    }
  }
})

test('P5b scrapbook cap keeps the 40 newest', () => {
  const many = (prefix: string): ScrapEntry[] =>
    Array.from({ length: 30 }, (_, i) => ({
      id: `${prefix}${i}`,
      at: new Date(BASE + i * 60_000).toISOString(),
      text: 'x',
    }))
  const r = rng(6)
  const a = { ...genHaggling(r, IDS), scrapbook: many('a') }
  const b = { ...genHaggling(r, IDS), scrapbook: many('b') }
  const m = mergeHaggling(a, b)
  assert.equal(m.scrapbook.length, 40)
  assert.ok(timeOf(m.scrapbook[0].at) >= timeOf(m.scrapbook[39].at))
})

test('P6 identity and schedule always come from the cloud', () => {
  const r = rng(7)
  for (let i = 0; i < 300; i++) {
    const local = { ...genHaggling(r, IDS), name: 'Tampered', breakfastHour: 3, eggId: 'evil' }
    const remote = genHaggling(r, IDS)
    const m = mergeHaggling(local, remote)
    assert.equal(m.name, remote.name)
    assert.equal(m.eggId, remote.eggId)
    assert.equal(m.breakfastHour, remote.breakfastHour)
    assert.equal(m.livingOn, remote.livingOn)
  }
})

test('P7 weather slots are a set union, never applied twice', () => {
  const r = rng(8)
  for (let i = 0; i < 300; i++) {
    const a = genHaggling(r, IDS)
    const b = genHaggling(r, IDS)
    const m = mergeHaggling(a, b)
    const want = new Set([...(a.weatherApplied ?? []), ...(b.weatherApplied ?? [])])
    assert.equal(m.weatherApplied?.length ?? 0, want.size)
    assert.equal(new Set(m.weatherApplied).size, m.weatherApplied?.length ?? 0)
  }
})

test('P8 a cleared transfer code in the cloud is not resurrected by a stale local copy', () => {
  const r = rng(9)
  const local = { ...genHaggling(r, IDS), transferCode: 'BRAW7K' }
  const remote = { ...genHaggling(r, IDS) }
  delete remote.transferCode
  assert.equal(mergeHaggling(local, remote).transferCode, undefined)
})

test('P9 unparseable timestamps count as oldest', () => {
  const r = rng(10)
  const good = genHaggling(r, IDS)
  const bad = { ...genHaggling(r, IDS), lastTickAt: 'not-a-date' }
  assert.deepStrictEqual(meters(mergeHaggling(bad, good)), meters(good))
  assert.deepStrictEqual(meters(mergeHaggling(good, bad)), meters(good))
})

// ---- scenario from the spec: phone offline, nest cared, reconnect -----------
test('scenario: phone offline care + nest care, reconnect keeps both memories', () => {
  const ctx = (min: number) => ({ temperamentId: 'douce', nowMs: BASE + min * 60_000 })
  const start: Haggling = {
    eggId: 'egg-1', name: 'Wee Yin', cloudChildId: 'child-1',
    breakfastHour: 8, dinnerHour: 18, bedHour: 22,
    hunger: 60, mood: 60, energy: 60, mess: 10, healthXp: 50,
    lastTickAt: new Date(BASE).toISOString(), scrapbook: [], livingOn: 'phone',
  }
  const phone = applyCare(start, 'walk', ctx(30)).haggling // offline on the phone
  const nest = applyCare(start, 'feed', ctx(60)).haggling // later, on the nest -> cloud
  const merged = mergeHaggling(phone, nest)
  assert.equal(merged.lastTickAt, nest.lastTickAt) // nest was newer
  assert.deepStrictEqual(meters(merged), meters(nest))
  const texts = merged.scrapbook.map((s) => s.text).join('|')
  assert.ok(texts.includes('A walk'), 'phone memory kept')
  assert.ok(texts.includes('Fed Wee Yin'), 'nest memory kept')
  // merge first, then tick forward once for the offline gap
  const later = tick(merged, ctx(180)).haggling
  assert.ok(later.hunger <= merged.hunger)
})
