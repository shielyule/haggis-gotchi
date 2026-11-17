// Spec: .kiro/specs/photo-care T6. Every case is a REAL Rekognition answer (17 Nov 2026).
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { matchTreat, seenSummary, type Detected } from './photoMatch.ts'

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
