// Run: node --test supabase/functions/_shared/shared.test.ts
// Spec: .kiro/specs/security-hardening T2, T3
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { isAuthorizedCron, timingSafeEqual } from './auth.ts'
import {
  buildPlayFilmEmail,
  buildReadyEmail,
  cleanDisplayName,
  escapeHtml,
  isPlausibleEmail,
  safeSlug,
} from './email.ts'

test('escapeHtml neutralises tags, quotes and ampersands', () => {
  assert.equal(
    escapeHtml(`<script>alert("x")</script> & 'y'`),
    '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; &#39;y&#39;',
  )
})

test('safeSlug rejects hostile candidates and falls back to the name', () => {
  assert.equal(safeSlug('evil.com/phish', 'Moira'), 'moira')
  assert.equal(safeSlug('../../admin', 'Moira'), 'moira')
  assert.equal(safeSlug('https://evil.com', 'Moira'), 'moira')
  assert.equal(safeSlug('Moira', 'Moira'), 'moira') // uppercase is not well-formed
  assert.equal(safeSlug('a'.repeat(41), 'Moira'), 'moira')
  assert.equal(safeSlug('', ''), 'carer')
})

test('safeSlug accepts a well-formed slug and blocks reserved words', () => {
  assert.equal(safeSlug('moira-2k', 'x'), 'moira-2k')
  assert.equal(safeSlug('admin', 'Fiona'), 'fiona')
  assert.equal(safeSlug('admin', 'Admin'), 'admin-1')
})

test('cleanDisplayName keeps only letters, numbers, space, apostrophe, hyphen', () => {
  assert.equal(cleanDisplayName('Moira\r\nBcc: x@evil.com'), 'Moira Bcc x evil com')
  assert.equal(cleanDisplayName('<b>Moira</b>'), 'b Moira b')
  assert.equal(cleanDisplayName("Seán O'Neil-Brown"), "Seán O'Neil-Brown")
  assert.equal(cleanDisplayName('https://evil.com'), 'https evil com')
  assert.equal(cleanDisplayName('   '), 'carer')
  assert.equal(cleanDisplayName('!!!'), 'carer')
  assert.equal(cleanDisplayName('x'.repeat(100)).length, 40)
})

test('buildReadyEmail never lets markup or a foreign URL through', () => {
  const mail = buildReadyEmail({
    displayName: '"><a href="https://evil.com">Click</a>',
    slug: 'evil.com/phish',
    siteUrl: 'https://haggisgotchi.com/',
  })
  assert.ok(!mail.html.includes('evil.com'), 'no evil URL in html')
  assert.ok(!mail.html.includes('://evil'), 'no foreign scheme')
  assert.equal((mail.html.match(/<a /g) ?? []).length, 1, 'only our own anchor')
  assert.ok(mail.nestUrl.startsWith('https://haggisgotchi.com/'))
  assert.match(mail.slug, /^[a-z0-9-]+$/)
})

test('buildReadyEmail normal case', () => {
  const mail = buildReadyEmail({
    displayName: 'Moira',
    slug: 'moira',
    siteUrl: 'https://haggisgotchi.com',
  })
  assert.equal(mail.nestUrl, 'https://haggisgotchi.com/moira')
  assert.ok(mail.html.includes('Hello Moira'))
  assert.ok(mail.html.includes('ignore this email'))
})

test('isPlausibleEmail', () => {
  assert.equal(isPlausibleEmail('a@b.co'), true)
  assert.equal(isPlausibleEmail('a b@c.co'), false)
  assert.equal(isPlausibleEmail('a@b'), false)
  assert.equal(isPlausibleEmail('<x>@b.co'), false)
  assert.equal(isPlausibleEmail('a@b.co,c@d.co'), false)
  assert.equal(isPlausibleEmail('x'.repeat(260) + '@b.co'), false)
  assert.equal(isPlausibleEmail(42), false)
})

test('cron auth fails closed', () => {
  const secret = 's'.repeat(32)
  assert.equal(isAuthorizedCron(secret, secret), true)
  assert.equal(isAuthorizedCron(null, secret), false)
  assert.equal(isAuthorizedCron('', secret), false)
  assert.equal(isAuthorizedCron('wrong', secret), false)
  assert.equal(isAuthorizedCron(secret, undefined), false)
  assert.equal(isAuthorizedCron('short', 'short'), false) // weak secret refused
})

test('timingSafeEqual', () => {
  assert.equal(timingSafeEqual('abc', 'abc'), true)
  assert.equal(timingSafeEqual('abc', 'abd'), false)
  assert.equal(timingSafeEqual('abc', 'abcd'), false)
})

test('play-film email escapes names and links only to the site', () => {
  const m = buildPlayFilmEmail({
    carerName: '<b>Moira</b>',
    hagglingName: '"><a href="https://evil.com">x</a>',
    siteUrl: 'https://haggisgotchi.com/',
  })
  assert.ok(!m.html.includes('evil.com'))
  assert.equal((m.html.match(/<a /g) ?? []).length, 1)
  assert.ok(m.html.includes('href="https://haggisgotchi.com/"'))
  assert.match(m.subject, /^Look what /)
})
