// Spec: .kiro/specs/security-hardening T4 (R1.3, R4.1)
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { clientIp, DEMO_WAIT_MS, FULL_WAIT_MS, validateClaim } from './claim.ts'

const good = () => ({
  eggId: '3f2b8c1e-9d4a-4c6b-8e2f-1a2b3c4d5e6f',
  storyId: 'douce-hearth-basking',
  demo: true,
  answers: {
    displayName: 'Moira',
    email: 'Moira@Example.com ',
    slug: 'moira',
    pet: 'a collie',
    place: 'seaside',
    games: '',
    comfortFood: 'tattie scones',
    weatherDay: 'rainy',
    familyQuirk: 'Haud yer wheesht',
    chaos: 12,
    teenIdentityOptIn: false,
    teenDisclaimerAck: false,
  },
})

test('a normal claim is accepted and the email is taken OUT of answers', () => {
  const r = validateClaim(good())
  assert.equal(r.ok, true)
  if (!r.ok) return
  assert.equal(r.value.email, 'moira@example.com')
  assert.equal('email' in r.value.answers, false)
  assert.equal(r.value.waitMs, DEMO_WAIT_MS)
  assert.equal(r.value.answers.slug, 'moira')
})

test('wait is chosen by the server: only demo or full, never a client number', () => {
  const b = { ...good(), demo: false, waitMs: 1 }
  const r = validateClaim(b)
  assert.equal(r.ok, true)
  if (r.ok) assert.equal(r.value.waitMs, FULL_WAIT_MS)
})

test('rejects bad email, bad id, bad story id', () => {
  for (const email of ['', 'x', 'a@b', 'a@b.co,c@d.co', '<a>@b.co', 'x'.repeat(260) + '@b.co']) {
    const b = good()
    b.answers.email = email
    assert.equal(validateClaim(b).ok, false, email)
  }
  assert.equal(validateClaim({ ...good(), eggId: 'not-a-uuid' }).ok, false)
  assert.equal(validateClaim({ ...good(), storyId: '../../etc' }).ok, false)
})

test('rejects unknown keys, wrong types and out-of-range chaos', () => {
  const extra = good() as Record<string, unknown>
  ;(extra.answers as Record<string, unknown>).isAdmin = true
  assert.equal(validateClaim(extra).ok, false)

  for (const chaos of [-1, 101, 50.5, '50', null]) {
    const b = good() as unknown as { answers: Record<string, unknown> }
    b.answers.chaos = chaos
    assert.equal(validateClaim(b).ok, false, String(chaos))
  }

  const b = good() as unknown as { answers: Record<string, unknown> }
  b.answers.place = 'castle'
  assert.equal(validateClaim(b).ok, false)
  b.answers.place = 'city'
  b.answers.teenIdentityOptIn = 'yes'
  assert.equal(validateClaim(b).ok, false)
})

test('rejects over-long text and over-size answers', () => {
  const b = good()
  b.answers.displayName = 'x'.repeat(41)
  assert.equal(validateClaim(b).ok, false)
  const c = good()
  c.answers.familyQuirk = 'x'.repeat(5000)
  assert.equal(validateClaim(c).ok, false)
  assert.equal(validateClaim(null).ok, false)
  assert.equal(validateClaim([]).ok, false)
})

test('hostile slug is replaced, hostile name is cleaned', () => {
  const b = good()
  b.answers.slug = 'evil.com/phish'
  b.answers.displayName = '<b>Moira</b>'
  const r = validateClaim(b)
  assert.equal(r.ok, true)
  if (!r.ok) return
  assert.match(r.value.answers.slug, /^[a-z0-9-]+$/)
  assert.ok(!r.value.answers.displayName.includes('<'))
})

test('clientIp takes the first forwarded address only', () => {
  assert.equal(clientIp('1.2.3.4, 10.0.0.1'), '1.2.3.4')
  assert.equal(clientIp(null), '')
})
