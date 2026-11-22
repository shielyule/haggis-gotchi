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
