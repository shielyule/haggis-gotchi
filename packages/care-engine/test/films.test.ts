// Spec: .kiro/specs/play-film T2
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { isDemoEgg, isPlayFilmUnlocked, playFilmUnlockAt } from '../src/films.ts'

const H = '2026-11-17T10:00:00Z'
const t = (iso: string) => Date.parse(iso)

test('demo eggs: wait of 2 minutes or less', () => {
  assert.equal(isDemoEgg('2026-11-17T09:00:00Z', '2026-11-17T09:01:30Z'), true)
  assert.equal(isDemoEgg('2026-11-17T09:00:00Z', '2026-11-17T09:30:00Z'), false)
  assert.equal(isDemoEgg('bad', '2026-11-17T09:30:00Z'), false)
})

test('real eggs unlock the playing film 24 hours after hatching', () => {
  assert.equal(isPlayFilmUnlocked(H, false, t('2026-11-18T09:59:59Z')), false)
  assert.equal(isPlayFilmUnlocked(H, false, t('2026-11-18T10:00:00Z')), true)
})

test('demo eggs unlock it after 3 minutes', () => {
  assert.equal(isPlayFilmUnlocked(H, true, t('2026-11-17T10:02:59Z')), false)
  assert.equal(isPlayFilmUnlocked(H, true, t('2026-11-17T10:03:00Z')), true)
})

test('unknown hatch time never unlocks', () => {
  assert.equal(playFilmUnlockAt(undefined, false), null)
  assert.equal(isPlayFilmUnlocked(undefined, true, Date.now()), false)
})
