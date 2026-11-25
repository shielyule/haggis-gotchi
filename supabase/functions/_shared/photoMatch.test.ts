// Spec: .kiro/specs/photo-care T6. Every case is a REAL Rekognition answer (17 Nov 2026).
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { matchTreat, seenSummary, treatLine, type Detected } from './photoMatch.ts'

const fx = JSON.parse(
  readFileSync(new URL('./fixtures/photo/rekognition-2026-11-17.json', import.meta.url), 'utf8'),
) as Record<string, Detected>

const expected: Record<string, string | null> = {
  'irn-bru-can': 'irn-bru', // logo not read; "BRU'D IN SCOTLAND" is
  'irn-bru-bottles': 'irn-bru',
  'irn-bru-girder': 'irn-bru', // IRNIBRU at 79.8%
  bagpipe: 'bagpipes',
  piper: 'bagpipes',
  'control-tartan-skirt': 'kilt', // Tartan 95, Kilt 79: tartan counts
  heather: 'heather', // Purple 95 + Flower 100 (Rekognition has no "Heather" label)
  shortbread: 'shortbread',
  'shortbread-2': 'shortbread',
  'kilt-person': null, // known miss: Skirt 90, Tartan 56 (below threshold)
  'unicorn-statue': null, // Rekognition saw a monument, not a unicorn: unicorn left out
  'whisky-bottle': null, // Bottle 55 only: whisky left out
  'control-coke-can': null, // a can, but not Irn-Bru
  'control-cat': null,
  'control-castle': null,
}

for (const [k, want] of Object.entries(expected)) {
  test(`real photo: ${k} -> ${want ?? 'no treat'}`, () => {
    assert.ok(fx[k], `fixture ${k} missing`)
    assert.equal(matchTreat(fx[k])?.id ?? null, want)
  })
}

test('the result card never lists people', () => {
  assert.ok(!seenSummary(fx['piper']).some((n) => /Person|Woman|Female|Adult/.test(n)))
})

// 18 Nov: front-of-can / glass photos (owner's Irn-Bru screenshot failed the same way: no text read).
const cans = JSON.parse(
  readFileSync(new URL('./fixtures/photo/rekognition-2026-11-18-cans.json', import.meta.url), 'utf8'),
) as Record<string, Detected>
const cansExpected: Record<string, string | null> = {
  'irn-bru-fm': 'irn-bru', // bottle, "IRN-BRU" read at 99%
  'irn-bru-can': 'irn-bru',
  'irn-bru-girder': 'irn-bru',
  'irn-bru-front-1': null, // known miss: no text read, labelled Glass/Beer
  'control-fanta-330': null,
  'control-fanta-thai': null,
  'control-fanta-hk': null,
  'control-coke-can': null,
}
for (const [k, want] of Object.entries(cansExpected)) {
  test(`real photo (18 Nov): ${k} -> ${want ?? 'no treat'}`, () => {
    assert.equal(matchTreat(cans[k])?.id ?? null, want)
  })
}

// 18 Nov: the owner's own Irn-Bru can, sent upright and turned both ways.
const owner = JSON.parse(
  readFileSync(new URL('./fixtures/photo/rekognition-2026-11-18-owner.json', import.meta.url), 'utf8'),
) as Record<string, Detected>
for (const k of ['owner-can-rot0', 'owner-can-rot90', 'owner-can-rot270']) {
  test(`owner's Irn-Bru can (${k}) -> irn-bru`, () => {
    assert.equal(matchTreat(owner[k])?.id, 'irn-bru')
  })
}

// 25 Nov: the owner's Scottish tablet (wrapper), four angles, and with the brand name covered (filming).
const tabletFx = JSON.parse(
  readFileSync(new URL('./fixtures/photo/rekognition-2026-11-25-tablet.json', import.meta.url), 'utf8'),
) as Record<string, Detected>
for (const k of Object.keys(tabletFx)) {
  test(`owner's tablet (${k}) -> tablet`, () => {
    assert.equal(matchTreat(tabletFx[k])?.id, 'tablet')
  })
}
test('an iPad is not tablet: the word alone, or with a gadget label, never counts', () => {
  const words = [{ text: 'Tablet', confidence: 99 }]
  assert.equal(matchTreat({ labels: [{ name: 'Electronics', confidence: 98 }, { name: 'Tablet Computer', confidence: 97 }, { name: 'Sweets', confidence: 90 }], words })?.id ?? null, null)
  assert.equal(matchTreat({ labels: [{ name: 'Electronics', confidence: 98 }], words })?.id ?? null, null)
  assert.equal(matchTreat({ labels: [{ name: 'Sweets', confidence: 99 }], words: [] })?.id ?? null, null, 'sweets without the word: not sure it is tablet')
})

test('Photo Treat line changes with age', () => {
  assert.match(treatLine('irn-bru', 'baby', 'Wee Yin'), /wee jig/)
  assert.match(treatLine('irn-bru', 'teen', 'Wee Yin'), /national anthem/)
  assert.match(treatLine('irn-bru', 'elder', 'Wee Yin'), /glass bottles/)
})
