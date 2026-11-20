// docs/LIFE-STAGES.md (agreed 20 Nov): one table of stage rules + identity.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { identityAt, identityLabel, identityMessage } from '../src/stages.ts'
import { applyCare, tick } from '../src/tick.ts'
import type { Haggling } from '../src/types.ts'

const T0 = new Date()
T0.setHours(14, 0, 0, 0)
const START = T0.getTime()
const fresh = (): Haggling => ({
  eggId: 'e', name: 'Wee Yin', breakfastHour: 8, dinnerHour: 18, bedHour: 22,
  hunger: 40, mood: 50, energy: 60, mess: 10, healthXp: 50,
  lastTickAt: new Date(START).toISOString(), scrapbook: [], livingOn: 'phone',
})
const ctx = (stage: 'baby' | 'child' | 'teen' | 'adult' | 'elder') => ({ temperamentId: 'ill-trickit', nowMs: START, stage })

test('teen pushes cuddles away: "Really?!" and a small dip', () => {
  const r = applyCare(fresh(), 'cuddle', ctx('teen')).haggling
  assert.equal(r.mood, 47)
  assert.match(r.scrapbook[0].text, /Really\?!|Not in FRONT/)
})

test('adult loves food: mood boost x1.5 and the gourmet line', () => {
  const baby = applyCare(fresh(), 'feed', ctx('baby')).haggling
  const adult = applyCare(fresh(), 'feed', ctx('adult')).haggling
  assert.ok(adult.mood - 50 > baby.mood - 50)
  assert.match(adult.scrapbook[0].text, /gourmet|stovies/)
})

test('old age: walks cost more energy; teen bedrooms get messy faster', () => {
  const adult = applyCare(fresh(), 'walk', ctx('adult')).haggling
  const elder = applyCare(fresh(), 'walk', ctx('elder')).haggling
  assert.ok(elder.energy < adult.energy)
  const later = (stage: 'adult' | 'teen') => tick(fresh(), { ...ctx(stage), nowMs: START + 3 * 3_600_000 }).haggling.mess
  assert.ok(later('teen') > later('adult'))
})

test('baby rules unchanged when no stage is given', () => {
  assert.deepEqual(applyCare(fresh(), 'treat', { temperamentId: 'ill-trickit', nowMs: START }).haggling.mood,
    applyCare(fresh(), 'treat', ctx('baby')).haggling.mood)
})

test('identity: only opted in, from day 17, same answer every time; questioning settles by day 26', () => {
  assert.equal(identityAt('child-1', false, 30), 'as-hatched')
  assert.equal(identityAt('child-1', true, 16), 'as-hatched')
  const seen = new Set<string>()
  for (let i = 0; i < 400; i++) {
    const k = `child-${i}`
    assert.equal(identityAt(k, true, 18), identityAt(k, true, 18))
    seen.add(identityAt(k, true, 18))
    assert.notEqual(identityAt(k, true, 27), 'questioning')
  }
  assert.deepEqual([...seen].sort(), ['as-hatched', 'non-binary', 'questioning', 'trans'])
})

test('labels: a trans lassie is a lassie; non-binary and questioning shown as written', () => {
  assert.equal(identityLabel('male', 'trans'), 'Lassie')
  assert.equal(identityLabel('female', 'trans'), 'Laddie')
  assert.equal(identityLabel('female', 'as-hatched'), 'Lassie')
  assert.equal(identityLabel('male', 'non-binary'), 'Non-binary')
  assert.equal(identityMessage('Wee Yin', 'male', 'as-hatched'), null)
  assert.match(identityMessage('Wee Yin', 'male', 'trans') ?? '', /I'm a lassie/)
})
