// Kiro - Property-based tests for pure app helpers (22 Nov 2026). Findings: docs/PBT-FINDINGS.md.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import fc from 'fast-check'
import { feedSentence, timeAgo } from '../src/lib/feed.ts'

const ACTIONS = ['feed', 'cuddle', 'walk', 'treat', 'clean', 'sleep', 'play', 'photo_treat', 'scold', 'weather', 'mystery']

test('A1 every public-scrapbook line names both the carer and the Haggling, and never says "undefined" (public-feed R2)', () => {
  fc.assert(
    fc.property(fc.string({ maxLength: 40 }), fc.string({ maxLength: 40 }), fc.constantFrom(...ACTIONS), fc.option(fc.string(), { nil: null }), (c, h, action, treat) => {
      const s = feedSentence({ carer_name: c, haggling_name: h, action, treat_id: treat, at: '2026-11-17T10:00:00Z' })
      assert.ok(s.includes(c || 'A carer') && s.includes(h || 'their Haggling'), s)
      assert.ok(!/undefined|null/.test(s), s)
    }),
    { numRuns: 300 },
  )
})

test('A2 "how long ago" always reads sensibly: never negative, never NaN, and grows with time', () => {
  fc.assert(
    fc.property(fc.integer({ min: 0, max: 10 * 86_400_000 }), fc.integer({ min: -3_600_000, max: 10 * 86_400_000 }), (base, ago) => {
      const at = new Date(1_800_000_000_000 - ago).toISOString()
      const s = timeAgo(at, 1_800_000_000_000)
      assert.ok(!/NaN|-/.test(s), s)
      void base
    }),
    { numRuns: 300 },
  )
})

test('A3 lines older than a day say days, not "30 hours ago"', () => {
  fc.assert(
    fc.property(fc.integer({ min: 25, max: 24 * 30 }), (hours) => {
      const s = timeAgo(new Date(1_800_000_000_000 - hours * 3_600_000).toISOString(), 1_800_000_000_000)
      assert.ok(!/\d+ hours ago/.test(s) || hours < 24, s)
    }),
    { numRuns: 100 },
  )
})

// ---------------------------------------------------------------- Seasonal costumes (.kiro/specs/seasonal-costumes)
import { existsSync } from 'node:fs'
import { costumeFor, inWindow, SEASONS, seasonFor, type MonthDay } from '../src/data/costumes.ts'

const STAGES = ['baby', 'child', 'teen', 'adult', 'elder']
const TEMPS = ['douce', 'skeigh', 'ill-trickit', 'ree', 'radge', 'fair-wud']
const DAYS_IN = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
const monthDay = fc.integer({ min: 1, max: 12 }).chain((month) => fc.record({ month: fc.constant(month), day: fc.integer({ min: 1, max: DAYS_IN[month - 1] }) }))
/** Every day of the year in order, 1 Jan .. 31 Dec. */
const YEAR: MonthDay[] = DAYS_IN.flatMap((n, m) => Array.from({ length: n }, (_, d) => ({ month: m + 1, day: d + 1 })))
const idx = (md: MonthDay) => YEAR.findIndex((x) => x.month === md.month && x.day === md.day)

test('A4 a costume shows exactly when the date is in a season that has art for this stage and temperament (seasonal-costumes R1.1, R1.2)', () => {
  fc.assert(
    fc.property(monthDay, fc.constantFrom(...STAGES), fc.constantFrom(...TEMPS), (md, stage, temp) => {
      const c = costumeFor(temp, stage, md, null)
      const season = seasonFor(md)
      const art = season?.art[stage]?.[temp]
      assert.equal(c?.src ?? null, art ?? null)
      if (c) assert.equal(c.season.id, season?.id)
    }),
    { numRuns: 500 },
  )
})

test('A5 a date window agrees with walking the calendar day by day, including over New Year (R1.3)', () => {
  fc.assert(
    fc.property(monthDay, monthDay, monthDay, (md, from, to) => {
      // Walk from `from` forward until `to`, wrapping at 31 Dec.
      const a = idx(from)
      const b = idx(to)
      const walk: number[] = []
      for (let i = a; ; i = (i + 1) % YEAR.length) {
        walk.push(i)
        if (i === b) break
      }
      assert.equal(inWindow(md, from, to), walk.includes(idx(md)), `${JSON.stringify(md)} in ${JSON.stringify(from)}-${JSON.stringify(to)}`)
    }),
    { numRuns: 500 },
  )
})

test('A6 at most one season is active on any day of the year (R1.4)', () => {
  for (const md of YEAR) {
    const active = SEASONS.filter((s) => inWindow(md, s.from, s.to))
    assert.ok(active.length <= 1, `${md.day}/${md.month}: ${active.map((s) => s.id).join(', ')}`)
  }
  // The owner's dates (23 Nov), first and last day inclusive, and the days either side.
  const owner: [string, MonthDay, MonthDay][] = [
    ['halloween', { month: 10, day: 15 }, { month: 11, day: 1 }],
    ['st-andrews', { month: 11, day: 28 }, { month: 12, day: 1 }],
    ['christmas', { month: 12, day: 10 }, { month: 1, day: 1 }],
    ['burns-night', { month: 1, day: 20 }, { month: 1, day: 27 }],
    ['easter', { month: 3, day: 24 }, { month: 4, day: 1 }],
  ]
  for (const [id, first, last] of owner) {
    const before = YEAR[(idx(first) - 1 + YEAR.length) % YEAR.length]
    const after = YEAR[(idx(last) + 1) % YEAR.length]
    assert.equal(seasonFor(first)?.id, id, `${id} first day`)
    assert.equal(seasonFor(last)?.id, id, `${id} last day`)
    assert.notEqual(seasonFor(before)?.id, id, `${id} day before`)
    assert.notEqual(seasonFor(after)?.id, id, `${id} day after`)
  }
  assert.equal(seasonFor({ month: 12, day: 31 })?.id, 'christmas', 'Christmas runs over New Year')
})

test('A7 a demo preview shows the costume on any date where art exists, never where it does not (R3.2)', () => {
  fc.assert(
    fc.property(monthDay, fc.constantFrom(...STAGES), fc.constantFrom(...TEMPS), fc.constantFrom(...SEASONS.map((s) => s.id), 'off', 'nonsense'), (md, stage, temp, preview) => {
      const c = costumeFor(temp, stage, md, preview)
      const s = SEASONS.find((x) => x.id === preview)
      if (s) assert.equal(c?.src ?? null, s.art[stage]?.[temp] ?? null)
      if (preview === 'off') assert.deepEqual(c, costumeFor(temp, stage, md, null))
      if (preview === 'nonsense') assert.equal(c, null)
    }),
    { numRuns: 500 },
  )
})

test('A8 every costume picture follows the naming rule and the file exists (R4)', () => {
  for (const s of SEASONS) {
    for (const [stage, byTemp] of Object.entries(s.art)) {
      for (const [temp, src] of Object.entries(byTemp)) {
        assert.equal(src, `/art/haggling-${stage}-${s.id}-${temp}.jpeg`)
        assert.ok(existsSync(new URL(`../public${src}`, import.meta.url)), `missing ${src}`)
      }
    }
  }
})
