// Spec: lifespan-graveyard T3
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { epitaph, lifeStatus, toneFor } from '../src/life.ts'

const BORN = '2026-11-01T10:00:00Z'
const ENDS = '2026-12-13T10:00:00Z' // +42 days
const at = (days: number) => Date.parse(BORN) + days * 86_400_000

test('stages over 6 weeks', () => {
  const s = (d: number) => lifeStatus(BORN, ENDS, at(d)).stage
  assert.deepEqual([0, 6.9, 7, 13.9, 14, 23.9, 24, 35.9, 36, 41.9].map(s),
    ['baby', 'baby', 'child', 'child', 'teen', 'teen', 'adult', 'adult', 'elder', 'elder'])
})

test('days left and departure', () => {
  assert.equal(lifeStatus(BORN, ENDS, at(0)).daysLeft, 42)
  assert.equal(lifeStatus(BORN, ENDS, at(41.5)).daysLeft, 1)
  assert.equal(lifeStatus(BORN, ENDS, at(41.5)).departed, false)
  assert.equal(lifeStatus(BORN, ENDS, at(42)).departed, true)
  assert.equal(lifeStatus(BORN, ENDS, at(10), '2026-11-11T00:00:00Z').departed, true)
})

test('tone boundaries', () => {
  assert.deepEqual([100, 60, 59.9, 35, 34.9, 0].map(toneFor), ['bright', 'bright', 'dim', 'dim', 'dark', 'dark'])
})

test('epitaph is stable per name and fills days', () => {
  assert.equal(epitaph('Firecracker', 'bright', 42), epitaph('Firecracker', 'bright', 42))
  assert.match(epitaph('Firecracker', 'dark', 42), /Firecracker.*42/)
})
