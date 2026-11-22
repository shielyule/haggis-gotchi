// Kiro - Property: the shared engine gives the same answer wherever it runs (22 Nov 2026).
// The phone runs in the carer's time zone; Supabase Edge Functions run in UTC.
// Own file, because it changes process.env.TZ (node --test runs each file separately).
import assert from 'node:assert/strict'
import { test } from 'node:test'
import fc from 'fast-check'
import { tick, type Haggling } from '../src/index.ts'

const HOUR = 3_600_000
const T0 = Date.parse('2026-11-01T00:00:00Z')

test('P28 ticking a Haggling gives the same bars on a UK phone, a New York phone and the UTC server', { todo: 'finding F2, docs/PBT-FINDINGS.md' }, () => {
  fc.assert(
    fc.property(
      fc.integer({ min: T0, max: T0 + 50 * 24 * HOUR }),
      fc.integer({ min: 0, max: 23 }),
      fc.integer({ min: 1, max: 8 }),
      (at, breakfastHour, hours) => {
        const h: Haggling = { eggId: 'e', name: 'N', breakfastHour, dinnerHour: (breakfastHour + 10) % 24, bedHour: (breakfastHour + 13) % 24, hunger: 30, mood: 70, energy: 70, mess: 10, healthXp: 50, lifeXp: 0, lastTickAt: new Date(at).toISOString(), scrapbook: [], livingOn: 'phone' }
        const ctx = { temperamentId: 'douce', nowMs: at + hours * HOUR }
        const results = ['Europe/London', 'America/New_York', 'UTC', 'Asia/Tokyo'].map((tz) => {
          process.env.TZ = tz
          const r = tick(h, ctx).haggling
          return { tz, mood: r.mood, healthXp: r.healthXp }
        })
        process.env.TZ = 'Europe/London'
        for (const r of results) assert.deepEqual([r.mood, r.healthXp], [results[0].mood, results[0].healthXp], `${r.tz} differs from ${results[0].tz}`)
      },
    ),
    { numRuns: 200 },
  )
})
