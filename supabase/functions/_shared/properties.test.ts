// Kiro - Property-based tests for shared server code (22 Nov 2026).
// Rules from .kiro/specs/security-hardening, care-reminders, photo-care, share-card.
// Findings: docs/PBT-FINDINGS.md.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import fc from 'fast-check'
import { isAuthorizedCron, timingSafeEqual } from './auth.ts'
import { validateClaim } from './claim.ts'
import { buildPlayFilmEmail, buildReadyEmail, cleanDisplayName, escapeHtml, isPlausibleEmail, safeSlug, slugifyName } from './email.ts'
import { matchTreat, treatLine, TREATS, type TreatId } from './photoMatch.ts'
import { dailySlotKeys, dueReminders, isQuietHour, localClock, type ChildRow } from './reminders.ts'
import { esc, ogTags } from '../../../apps/mother/functions/_lib/og.ts'
import { slugifyName as appSlugify } from '../../../apps/mother/src/lib/slug.ts'

const RUNS = { numRuns: 300 }
const HOUR = 3_600_000
const T0 = Date.parse('2026-11-01T00:00:00Z')
const time = fc.integer({ min: T0, max: T0 + 60 * 24 * HOUR })
const nasty = fc.oneof(fc.string(), fc.constantFrom('<script>alert(1)</script>', '"><img src=x onerror=alert(1)>', "O'Neil & Sons", 'evil.com', 'javascript:alert(1)', 'a\u0000b\u202Ec', '😈'.repeat(30)))
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

// ---------------------------------------------------------------- Claiming an egg (security-hardening R1.3, R2, R4.1)

test('S1 validateClaim never crashes, whatever junk arrives', () => {
  fc.assert(fc.property(fc.anything(), (body) => { validateClaim(body) }), RUNS)
  fc.assert(fc.property(fc.record({ eggId: fc.uuid(), answers: fc.dictionary(fc.string(), fc.anything()) }), (body) => { validateClaim(body) }), RUNS)
})

const goodAnswers = fc.record({
  displayName: fc.string({ minLength: 1, maxLength: 40 }).filter((s) => s.trim().length > 0 && !/[\u0000-\u001f\u007f]/.test(s)),
  email: fc.emailAddress().filter((e) => e.length <= 254 && !/[\s<>"',;]/.test(e)),
  slug: fc.option(fc.string({ maxLength: 50 }), { nil: undefined }),
  place: fc.constantFrom('', 'city', 'town', 'countryside', 'seaside'),
  weatherDay: fc.constantFrom('', 'rainy', 'beach', 'forest'),
  chaos: fc.integer({ min: 0, max: 100 }),
  pet: fc.string({ maxLength: 60 }),
  teenIdentityOptIn: fc.boolean(),
})

test('S2 an accepted claim never keeps the email in answers, and the slug is always URL-safe (R4.1, R2.2)', () => {
  fc.assert(
    fc.property(fc.uuid({ version: 4 }), goodAnswers, fc.boolean(), (eggId, answers, demo) => {
      const r = validateClaim({ eggId, answers, demo })
      if (!r.ok) return
      assert.ok(!('email' in r.value.answers), 'email leaked into answers')
      assert.ok(!JSON.stringify(r.value.answers).includes(r.value.email), 'email text inside answers')
      assert.match(r.value.answers.slug, SLUG_RE)
      assert.ok(r.value.answers.slug.length <= 40 + 2)
      assert.ok(r.value.answers.displayName.length <= 40)
    }),
    RUNS,
  )
})

test('S3 a normal sign-up is accepted (no false refusals)', () => {
  fc.assert(
    fc.property(fc.uuid({ version: 4 }), goodAnswers, (eggId, answers) => {
      const r = validateClaim({ eggId, answers })
      assert.ok(r.ok, `refused: ${!r.ok && r.error} for ${JSON.stringify(answers)}`)
    }),
    RUNS,
  )
})

test('S4 anything placed in an email is escaped: no raw tags or quotes from user text (R2.1)', () => {
  fc.assert(
    fc.property(nasty, nasty, (a, b) => {
      for (const s of [escapeHtml(a), esc(a)]) assert.ok(!/[<>"']/.test(s), `unescaped in ${s}`)
      const ready = buildReadyEmail({ displayName: a, slug: b, siteUrl: 'https://haggisgotchi.com' })
      const film = buildPlayFilmEmail({ carerName: a, hagglingName: b, siteUrl: 'https://haggisgotchi.com' })
      for (const html of [ready.html, film.html]) assert.ok(!/<script|<img/i.test(html), 'markup from user text')
      assert.ok(!/[./:@]/.test(cleanDisplayName(a)), 'linkable text in display name')
      assert.match(ready.slug, SLUG_RE)
    }),
    RUNS,
  )
})

test('S5 the link-preview tags never carry markup from a Haggling name (share-card R5)', () => {
  fc.assert(
    fc.property(nasty, fc.constantFrom('douce', 'radge', 'nope'), fc.boolean(), (n, t, on) => {
      const tags = ogTags({ name: n, temperament_id: t, share_enabled: on }, 'https://haggisgotchi.com', 'abc')
      assert.ok(!/<script|<img/i.test(tags))
      for (const m of tags.matchAll(/content="([^"]*)"/g)) assert.ok(!/[<>]/.test(m[1]))
    }),
    RUNS,
  )
})

test('S6 the app and the server make the same nest slug from a name', () => {
  fc.assert(
    fc.property(fc.string({ maxLength: 60 }), (n) => {
      assert.equal(appSlugify(n), slugifyName(n), `app "${appSlugify(n)}" vs server "${slugifyName(n)}"`)
      assert.match(slugifyName(n), SLUG_RE)
      assert.match(safeSlug(n, n), SLUG_RE)
    }),
    RUNS,
  )
})

test('S7 isPlausibleEmail never accepts spaces, angle brackets, quotes or more than one @', () => {
  fc.assert(
    fc.property(fc.string({ maxLength: 300 }), (s) => {
      if (!isPlausibleEmail(s)) return
      const t = s.trim()
      assert.ok(!/[\s<>"',;]/.test(t) && t.split('@').length === 2 && t.length <= 254, t)
    }),
    RUNS,
  )
})

// ---------------------------------------------------------------- Cron secret (security-hardening R3)

test('S8 the cron check opens only for the exact secret, and short secrets never work', () => {
  fc.assert(
    fc.property(fc.string({ maxLength: 60 }), fc.string({ maxLength: 60 }), (header, secret) => {
      assert.equal(timingSafeEqual(header, secret), header === secret)
      assert.equal(isAuthorizedCron(header, secret), secret.length >= 24 && header === secret)
    }),
    RUNS,
  )
})

// ---------------------------------------------------------------- Reminders (care-reminders, quiet nights)

const tz = fc.constantFrom('Europe/London', 'America/New_York', 'Asia/Tokyo', 'Australia/Sydney', 'Pacific/Kiritimati', 'Not/AZone', '')
const child = fc.record({
  id: fc.uuid(), name: fc.string({ minLength: 1, maxLength: 12 }), temperament_id: fc.constantFrom('douce', 'radge', 'ree'),
  breakfast_hour: fc.integer({ min: 0, max: 23 }), dinner_hour: fc.integer({ min: 0, max: 23 }), bed_hour: fc.integer({ min: 0, max: 23 }),
  hunger: fc.integer({ min: 0, max: 100 }), mood: fc.integer({ min: 0, max: 100 }), energy: fc.integer({ min: 0, max: 100 }), mess: fc.integer({ min: 0, max: 100 }),
  health_xp: fc.integer({ min: -50, max: 100 }), lastAgo: fc.integer({ min: 0, max: 72 }), sleep: fc.option(fc.integer({ min: -10, max: 10 }), { nil: null }), endsIn: fc.option(fc.integer({ min: -48, max: 24 * 40 }), { nil: null }),
})
function row(c: fc.RecordValue<typeof child> extends never ? never : any, now: number): ChildRow {
  return { ...c, last_tick_at: new Date(now - c.lastAgo * HOUR).toISOString(), asleep_until: c.sleep === null ? null : new Date(now + c.sleep * HOUR).toISOString(), span_ends_at: c.endsIn === null ? null : new Date(now + c.endsIn * HOUR).toISOString() }
}

test('S9 the local clock is always a real hour and date, in any time zone (care-reminders R5)', () => {
  fc.assert(
    fc.property(tz, time, (z, now) => {
      const c = localClock(z, now)
      assert.ok(Number.isInteger(c.hour) && c.hour >= 0 && c.hour <= 23)
      assert.match(c.date, /^\d{4}-\d{2}-\d{2}$/)
    }),
    RUNS,
  )
})

test('S10 reminders: never crash, never repeat a key in one run, nothing while asleep, meals only at their hour (R3, R4)', () => {
  fc.assert(
    fc.property(child, tz, time, (c, z, now) => {
      const r = row(c, now)
      const due = dueReminders(r, z, now)
      assert.equal(new Set(due.map((d) => d.key)).size, due.length, 'duplicate key')
      if (c.sleep !== null && c.sleep > 0) assert.equal(due.length, 0, 'reminder while asleep')
      const { hour } = localClock(z, now)
      for (const d of due.filter((x) => x.key.startsWith('meal:'))) {
        const kind = d.key.split(':')[2]
        const want = kind === 'breakfast' ? r.breakfast_hour : kind === 'dinner' ? r.dinner_hour : r.bed_hour
        assert.equal(want, hour, `${kind} reminder at the wrong hour`)
      }
      for (const d of due) assert.ok(!/undefined|NaN/.test(d.title + d.body))
    }),
    RUNS,
  )
})

test('S11 quiet nights: every hour is either quiet or not, quiet is exactly 22:00-06:59, six distinct slots a day', () => {
  fc.assert(
    fc.property(fc.integer({ min: 0, max: 23 }), fc.uuid(), fc.date({ min: new Date(T0), max: new Date(T0 + 400 * 24 * HOUR), noInvalidDate: true }), (h, carer, d) => {
      assert.equal(isQuietHour(h), h >= 22 || h < 7)
      const slots = dailySlotKeys(carer, d.toISOString().slice(0, 10))
      assert.equal(new Set(slots).size, 6)
    }),
    RUNS,
  )
})

// ---------------------------------------------------------------- Photo Treat recognition (photo-care R3)

const label = fc.record({ name: fc.constantFrom('Can', 'Tin', 'Bottle', 'Bagpipe', 'Kilt', 'Tartan', 'Plaid', 'Purple', 'Flower', 'Plant', 'Cookie', 'Bread', 'Person', 'Dog', 'Car', fc.sample(fc.string(), 1)[0]), confidence: fc.double({ min: 0, max: 100, noNaN: true }) })
const word = fc.record({ text: fc.oneof(fc.constantFrom('IRN', 'BRU', 'IRN-BRU', 'ORIGINAL', 'BEST', 'COCA', 'Fanta'), fc.string()), confidence: fc.double({ min: 0, max: 100, noNaN: true }) })

test('S12 recognition never crashes, and an accepted treat always clears its own threshold (photo-care R3.1)', () => {
  fc.assert(
    fc.property(fc.array(label, { maxLength: 15 }), fc.array(word, { maxLength: 15 }), (labels, words) => {
      const m = matchTreat({ labels, words })
      if (m) {
        assert.ok(m.confidence >= 60, `accepted at ${m.confidence}%`)
        assert.ok(m.id in TREATS)
      }
    }),
    RUNS,
  )
})

test('S13 adding unrelated things to a photo (a dog, a car, a person) never changes the answer', () => {
  fc.assert(
    fc.property(fc.array(label, { maxLength: 10 }), fc.array(word, { maxLength: 10 }), fc.array(fc.record({ name: fc.constantFrom('Dog', 'Car', 'Person', 'Sky', 'Table'), confidence: fc.double({ min: 0, max: 100, noNaN: true }) }), { maxLength: 5 }), (labels, words, extra) => {
      assert.deepEqual(matchTreat({ labels: [...labels, ...extra], words }), matchTreat({ labels, words }))
    }),
    RUNS,
  )
})

test('S14 a treat line always names the Haggling, at every stage', () => {
  fc.assert(
    fc.property(fc.constantFrom(...(Object.keys(TREATS) as TreatId[])), fc.constantFrom(undefined, 'baby', 'child', 'teen', 'adult', 'elder'), fc.string({ minLength: 1, maxLength: 20 }), (id, st, n) => {
      const line = treatLine(id, st, n)
      assert.ok(line.includes(n) && !line.includes('{name}'), line)
    }),
    RUNS,
  )
})

// ---------------------------------------------------------------- AI words (.kiro/specs/ai-haggling)
import { BLOCKED, GENDERED, checkLine, wholeWord, cleanAiLine, diaryFacts, diaryPrompt, fallbackDiary, fallbackReaction, FAR_AWAY, nearestTown, reactionPrompt, safeLabels, safeName, TOWNS, type DiaryInput } from './aiText.ts'
import { arrange, isValidRiddle, parseRiddle, RIDDLE_BANK, riddleFor, topicFor, TOPICS } from './riddles.ts'

const BUCKETS = ['sunny', 'crisp', 'frost', 'hot', 'grey', 'rain', 'storm', 'snow', 'windy', 'humid', 'fog', 'haar']
const hagName = fc.string({ minLength: 1, maxLength: 40 })
const diaryInput = fc.record({
  name: hagName,
  temperament: fc.constantFrom('Douce', 'Skeigh', 'Ill-trickit', 'Ree', 'Radge', 'Fair Wud'),
  temperamentNote: fc.constantFrom('gentle', 'jumpy', 'mischievous', 'lively', 'fiery', 'wild'),
  stage: fc.constantFrom('Baby', 'Child', 'Teen', 'Adult', 'Old age'),
  day: fc.integer({ min: 0, max: 41 }),
  daysLeft: fc.integer({ min: 0, max: 42 }),
  place: fc.constantFrom('', 'Oban', 'Glasgow', FAR_AWAY),
  weather: fc.array(fc.record({ slot: fc.constantFrom('am' as const, 'pm' as const, 'eve' as const), bucket: fc.constantFrom(...BUCKETS), tempC: fc.option(fc.integer({ min: -15, max: 35 }), { nil: null }) }), { maxLength: 3 }),
  care: fc.dictionary(fc.constantFrom('feed', 'cuddle', 'walk', 'treat', 'clean', 'play', 'scold', 'sleep'), fc.integer({ min: 0, max: 9 })),
  mood: fc.integer({ min: 0, max: 100 }),
  season: fc.option(fc.constantFrom('Halloween', 'Christmas'), { nil: null }),
  milestone: fc.option(fc.constantFrom('became a Teen today', 'grew up today'), { nil: null }),
}) as fc.Arbitrary<DiaryInput>

/** An independent re-statement of R3.6, so checkLine is tested against the rule, not itself. */
function obeysRules(t: string, name: string, max: number): boolean {
  // Independent restatement: walk the words; the name's own words do not count against the line.
  const nameWords = name.toLowerCase().split(/[^\p{L}\p{N}']+/u).filter(Boolean)
  const all = t.toLowerCase().split(/[^\p{L}\p{N}']+/u).filter(Boolean)
  const named = all.some((_, i) => nameWords.length > 0 && nameWords.every((w, j) => all[i + j] === w))
  const words = all.filter((w) => !nameWords.includes(w))
  const lower = words.join(' ')
  return t.length <= max && named && !BLOCKED.some((b) => words.includes(b)) && !GENDERED.some((g) => words.includes(g)) && !/https?:|www\.|@/.test(lower) && !/\d{5,}/.test(lower)
}

test('S15 checkLine only lets through lines that obey every rule (ai-haggling R3.6, R4.3)', () => {
  const pieces = fc.oneof(fc.string({ maxLength: 40 }), fc.constantFrom(' he ', " she's ", ' hen ', ' shit ', ' whisky ', ' http://x.co ', ' a@b.com ', ' 123456 ', ' {name} ', '. ', '! ', ' wee ', ' dreich ', ' drama '))
  fc.assert(
    fc.property(safeLabelName(), fc.array(pieces, { maxLength: 12 }), (name, parts) => {
      const text = cleanAiLine(`${name} ${parts.join('')}`)
      if (checkLine(text, name, 300)) assert.ok(obeysRules(text, name, 300), text)
    }),
    RUNS,
  )
  assert.ok(checkLine('Dear diary, Wee Yin watched the rain all day. Braw.', 'Wee Yin', 300))
  assert.ok(!checkLine('Dear diary, the rain was braw.', 'Wee Yin', 300), 'must name the Haggling')
  assert.ok(!checkLine('Wee Yin had a wee dram by the fire.', 'Wee Yin', 300), 'no drink')
  assert.ok(checkLine('Wee Yin loved the drama of the storm.', 'Wee Yin', 300), 'drama is fine')
  // Found by S16 in CI (24 Nov, seed -953072770): a Haggling named with digits.
  assert.ok(checkLine('Another day in the life of 00000. Hoping for more visits tomorrow.', '00000', 300), 'a numeric name is not a phone number')
  assert.ok(!checkLine('00000 says call 0131 4960000 now.', '00000', 300), 'other long numbers are still blocked')
  // Found live 25 Nov (Gemini): "Wee Yin reckons that bonnie box is pure magic, so he's bouncin aff the walls".
  assert.ok(!checkLine("Wee Yin reckons that box is magic, so he's bouncin aff the walls.", 'Wee Yin', 200), 'no he/she for a Haggling')
  assert.ok(checkLine('Wee Yin reckons that box is magic, so they are bouncin aff the walls.', 'Wee Yin', 200), 'they is fine')
  assert.ok(checkLine('Wee Yin met a hen and a hedgehog today.', 'Wee Yin', 200), 'words starting he- are fine')
  // Found by S16 (25 Nov): a Haggling called "t" turned "Another" into "ano her".
  assert.ok(checkLine('Another day in the life of t. Hoping for more visits tomorrow.', 't', 300), 'a one-letter name only counts as a whole word')
  assert.ok(!wholeWord('t').test('another'), 'not inside other words')
  // Found by S15 (25 Nov): a Haggling called "s" hid the "she" in "she's".
  assert.ok(!checkLine("s she's lovely.", 's', 300), 'apostrophes are part of a word')
})
function safeLabelName() {
  return hagName.map(safeName)
}

test('S16 the written diary and reactions always pass the same checks (R3.7, R4.3, R4.4)', () => {
  fc.assert(
    fc.property(diaryInput, (d) => {
      const line = fallbackDiary(d)
      assert.ok(checkLine(line, safeName(d.name), 300), line)
    }),
    RUNS,
  )
  fc.assert(
    fc.property(hagName, fc.array(fc.record({ name: fc.string({ maxLength: 40 }), confidence: fc.integer({ min: 0, max: 100 }) }), { maxLength: 8 }), (n, labels) => {
      const line = fallbackReaction(n, safeLabels(labels))
      assert.ok(checkLine(line, safeName(n), 200), line)
    }),
    RUNS,
  )
})

test('S17 prompts never carry an email, a carer name or coordinates (R6.2)', () => {
  fc.assert(
    // Stored areas are rounded to 0.1 degree, e.g. 55.9, -4.3 (weather-mood R1.2).
    fc.property(diaryInput, fc.emailAddress(), fc.integer({ min: 491, max: 609 }), fc.integer({ min: -79, max: 19 }), (d, email, lat10, lon10) => {
      fc.pre(lat10 % 10 !== 0 && lon10 % 10 !== 0)
      const lat = (lat10 / 10).toFixed(1)
      const lon = (lon10 / 10).toFixed(1)
      const withCarer = { ...d, carerName: 'Shiel', email, lat: Number(lat), lon: Number(lon) } as DiaryInput
      const p = diaryPrompt(withCarer)
      assert.ok(!p.includes(email) && !p.includes('Shiel') && !p.includes(lat) && !p.includes(lon), p)
      assert.ok(!/@/.test(p))
      const r = reactionPrompt(d.name, d.temperament, ['Dog', 'Ball'])
      assert.ok(!/@/.test(r))
    }),
    RUNS,
  )
})

test('S18 the place is always a listed town or "far from the glens", never coordinates (R3.3)', () => {
  const names = new Set([...TOWNS.map((t) => t.name), FAR_AWAY])
  fc.assert(
    fc.property(fc.double({ min: -90, max: 90, noNaN: true }), fc.double({ min: -180, max: 180, noNaN: true }), (lat, lon) => {
      const t = nearestTown(Math.round(lat * 10) / 10, Math.round(lon * 10) / 10)
      assert.ok(names.has(t), t)
      if (Math.abs(lat - 56) > 8 && Math.abs(lat - 53) > 8) assert.equal(t, FAR_AWAY)
    }),
    RUNS,
  )
  assert.equal(nearestTown(56.4, -5.5), 'Oban')
  assert.equal(nearestTown(40.7, -74.0), FAR_AWAY, 'New York judges are far from the glens')
})

test('S19 a stormy day puts the storm first, and the written diary is about the storm (R3.5)', () => {
  fc.assert(
    fc.property(diaryInput, (d) => {
      const stormy = { ...d, weather: [...d.weather, { slot: 'pm' as const, bucket: 'storm', tempC: 8 }] }
      assert.match(diaryFacts(stormy)[0], /storm/i)
      assert.match(fallbackDiary(stormy), /storm/i)
    }),
    RUNS,
  )
})

test('S20 riddles: every bank riddle is valid, parseRiddle accepts only valid riddles, any day gets a valid riddle (R5.3, R5.4)', () => {
  for (const r of RIDDLE_BANK) assert.ok(isValidRiddle(r), r.question)
  assert.ok(RIDDLE_BANK.length >= 20)
  fc.assert(
    fc.property(fc.date({ min: new Date('2026-01-01'), max: new Date('2030-12-31'), noInvalidDate: true }), (d) => {
      const day = d.toISOString().slice(0, 10)
      const r = riddleFor(day)
      assert.ok(isValidRiddle(r))
      assert.deepEqual(riddleFor(day), r, 'same riddle all day')
    }),
    RUNS,
  )
  const anyJson = fc.record({ question: fc.string({ maxLength: 320 }), options: fc.array(fc.string({ maxLength: 45 }), { maxLength: 4 }), answer: fc.oneof(fc.integer({ min: -1, max: 3 }), fc.constant('0')), explain: fc.string({ maxLength: 220 }) })
  fc.assert(
    fc.property(anyJson, fc.constantFrom('', 'Sure! ', '```json\n'), (j, prefix) => {
      const r = parseRiddle(prefix + JSON.stringify(j), 'the kelpie')
      if (r) assert.ok(isValidRiddle(r))
    }),
    RUNS,
  )
  assert.equal(parseRiddle('not json at all', 'x'), null)
})

test('S22 every topic has its own hand-written riddle, so a 24-day cycle never repeats (owner 25 Nov: bank only)', () => {
  const start = Date.parse('2026-12-01T12:00:00Z')
  const days = TOPICS.map((_, i) => new Date(start + i * 86_400_000).toISOString().slice(0, 10))
  const questions = new Set(days.map((d) => riddleFor(d).question))
  assert.equal(questions.size, TOPICS.length)
  for (const d of days) assert.equal(riddleFor(d).topic, topicFor(d), `bank riddle for ${topicFor(d)}`)
})

test('S21 the day\'s topic is fixed for the day and cycles through every topic; shuffling keeps the right answer (R5.2)', () => {
  const start = Date.parse('2026-12-01T12:00:00Z')
  const seen = new Set<string>()
  for (let i = 0; i < TOPICS.length; i++) seen.add(topicFor(new Date(start + i * 86_400_000).toISOString().slice(0, 10)))
  assert.equal(seen.size, TOPICS.length)
  fc.assert(
    fc.property(fc.constantFrom(...RIDDLE_BANK), fc.date({ min: new Date('2026-01-01'), max: new Date('2030-12-31'), noInvalidDate: true }), (r, d) => {
      const day = d.toISOString().slice(0, 10)
      const a = arrange(r, day)
      assert.equal(a.options[a.answer], r.options[r.answer])
      assert.deepEqual([...a.options].sort(), [...r.options].sort())
    }),
    RUNS,
  )
})
