// Kiro - Property-based tests for the shared care engine (22 Nov 2026).
// Each property is a rule from a spec (.kiro/specs/*/requirements.md) or docs/GAME-DESIGN.md.
// fast-check invents hundreds of Hagglings and care sequences per rule and shrinks any
// failure to the smallest example. Findings: docs/PBT-FINDINGS.md.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import fc from 'fast-check'
import {
  applyCare,
  applyPhotoTreat,
  applyWeather,
  epitaph,
  identityAt,
  identityLabel,
  identityMessage,
  isDemoEgg,
  isMisbehaving,
  isPlayFilmUnlocked,
  lifeLevel,
  lifeStatus,
  mergeHaggling,
  mischiefLine,
  RULES,
  stageLine,
  STAGES,
  tick,
  toneFor,
  WEATHER_BUCKETS,
  weatherLine,
  type CareAction,
  type Haggling,
  type StageId,
  type WeatherBucket,
  wholeBars,
} from '../src/index.ts'

const RUNS = { numRuns: 300 }
const HOUR = 3_600_000
const DAY = 24 * HOUR
const T0 = Date.parse('2026-11-01T00:00:00Z')
const T1 = Date.parse('2026-12-31T00:00:00Z')

const TEMPERAMENTS = ['douce', 'skeigh', 'ill-trickit', 'ree', 'radge', 'fair-wud'] as const
const STAGE_IDS: StageId[] = ['baby', 'child', 'teen', 'adult', 'elder']
const ACTIONS: CareAction[] = ['feed', 'cuddle', 'walk', 'treat', 'clean', 'sleep', 'play', 'scold']
const BARS = ['hunger', 'mood', 'energy', 'mess'] as const

const bar = fc.integer({ min: 0, max: 100 })
const time = fc.integer({ min: T0, max: T1 })
const temperament = fc.constantFrom(...TEMPERAMENTS)
const stage = fc.constantFrom(...STAGE_IDS)
const action = fc.constantFrom(...ACTIONS)
const bucket = fc.constantFrom(...(WEATHER_BUCKETS as readonly WeatherBucket[]))
const name = fc.string({ minLength: 1, maxLength: 20 })

/** Any valid Haggling, last ticked at `at`. */
function haggling(at: number) {
  return fc.record({
    eggId: fc.uuid(),
    name,
    breakfastHour: fc.integer({ min: 0, max: 23 }),
    dinnerHour: fc.integer({ min: 0, max: 23 }),
    bedHour: fc.integer({ min: 0, max: 23 }),
    hunger: bar,
    mood: bar,
    energy: bar,
    mess: bar,
    healthXp: fc.integer({ min: -100, max: 100 }),
    lifeXp: fc.integer({ min: 0, max: 5000 }),
    asleepFor: fc.option(fc.integer({ min: -2, max: 10 }), { nil: undefined }),
    playScore: fc.option(fc.integer({ min: -3, max: 9 }), { nil: undefined }),
  }).map((r): Haggling => {
    const { asleepFor, ...rest } = r
    return {
      ...rest,
      sick: r.healthXp < 0,
      lastTickAt: new Date(at).toISOString(),
      asleepUntil: asleepFor === undefined ? undefined : new Date(at + asleepFor * HOUR).toISOString(),
      scrapbook: [],
      livingOn: 'phone',
    }
  })
}

/** One step a carer (or the world) can take. */
const step = fc.oneof(
  fc.record({ kind: fc.constant('tick' as const), mins: fc.integer({ min: 0, max: 48 * 60 }) }),
  fc.record({ kind: fc.constant('care' as const), mins: fc.integer({ min: 0, max: 120 }), action, wins: fc.integer({ min: 0, max: 5 }) }),
  fc.record({ kind: fc.constant('photo' as const), mins: fc.integer({ min: 0, max: 120 }) }),
  fc.record({ kind: fc.constant('weather' as const), mins: fc.integer({ min: 0, max: 120 }), bucket, slot: fc.integer({ min: 0, max: 40 }) }),
)
type Step = typeof step extends fc.Arbitrary<infer S> ? S : never

function run(h0: Haggling, temp: string, st: StageId, steps: Step[], start: number, each?: (prev: Haggling, next: Haggling, s: Step) => void) {
  let h = h0
  let now = start
  for (const s of steps) {
    now += s.mins * 60_000
    const ctx = { temperamentId: temp, nowMs: now, stage: st }
    let next: Haggling
    if (s.kind === 'tick') next = tick(h, ctx).haggling
    else if (s.kind === 'care') next = applyCare(s.action === 'play' ? { ...h, playScore: s.wins } : h, s.action, ctx).haggling
    else if (s.kind === 'photo') next = applyPhotoTreat(h, 'shortbread', ctx).haggling
    else next = applyWeather(h, s.bucket, `slot-${String(s.slot).padStart(2, '0')}`, temp, new Date(now).toISOString(), undefined, 1).haggling
    each?.(h, next, s)
    h = next
  }
  return h
}

const world = fc.tuple(time, temperament, stage).chain(([at, temp, st]) =>
  fc.tuple(fc.constant(at), fc.constant(temp), fc.constant(st), haggling(at), fc.array(step, { maxLength: 30 })),
)

// ---------------------------------------------------------------- bars and XP

test('P1 bars always stay between 0 and 100, and show and save as whole numbers, whatever the carer does', () => {
  fc.assert(
    fc.property(world, ([at, temp, st, h, steps]) => {
      run(h, temp, st, steps, at, (_p, n) => {
        const whole = wholeBars(n)
        for (const b of BARS) {
          assert.ok(Number.isFinite(n[b]) && n[b] >= 0 && n[b] <= 100, `${b}=${n[b]}`)
          assert.ok(Number.isInteger(whole[b]) && Math.abs(whole[b] - n[b]) <= 0.5, `${b} shown as ${whole[b]}`)
        }
      })
    }),
    RUNS,
  )
})

test('P2 Life XP never goes down (photo-care R5.4)', () => {
  fc.assert(
    fc.property(world, ([at, temp, st, h, steps]) => {
      run(h, temp, st, steps, at, (p, n) => assert.ok((n.lifeXp ?? 0) >= (p.lifeXp ?? 0), `${p.lifeXp} -> ${n.lifeXp}`))
    }),
    RUNS,
  )
})

test('P3 Health XP never above 100, and "sick" always means Health XP below zero', () => {
  fc.assert(
    fc.property(world, ([at, temp, st, h, steps]) => {
      run(h, temp, st, steps, at, (_p, n) => {
        assert.ok(n.healthXp <= 100, `healthXp=${n.healthXp}`)
        assert.equal(Boolean(n.sick), n.healthXp < 0, `sick=${n.sick} healthXp=${n.healthXp}`)
      })
    }),
    RUNS,
  )
})

test('P4 care earns at most 30 Life XP a day, however many buttons are pressed (photo-care R5.2)', () => {
  fc.assert(
    fc.property(time, temperament, stage, fc.array(action, { minLength: 1, maxLength: 80 }), (at, temp, st, acts) => {
      // Midday, so the presses stay inside one calendar day; no time passes, so age adds nothing.
      const noon = Math.floor(at / DAY) * DAY + 12 * HOUR
      let h: Haggling = { eggId: 'e', name: 'N', breakfastHour: 8, dinnerHour: 18, bedHour: 21, hunger: 50, mood: 50, energy: 50, mess: 20, healthXp: 50, lifeXp: 0, lastTickAt: new Date(noon).toISOString(), scrapbook: [], livingOn: 'phone' }
      for (const a of acts) h = applyCare(h, a, { temperamentId: temp, nowMs: noon, stage: st }).haggling
      assert.ok((h.lifeXp ?? 0) <= RULES.lifeXpCareCapPerDay, `lifeXp=${h.lifeXp} after ${acts.length} presses`)
      assert.equal(h.lifeXp, Math.min(acts.length, RULES.lifeXpCareCapPerDay))
    }),
    RUNS,
  )
})

test('P5 checking often or rarely gives about the same bars (one tick of 6 h vs many small ticks)', () => {
  // The phone ticks every 30-60 s while open; the server projects once. They should agree.
  fc.assert(
    fc.property(time, temperament, stage, fc.integer({ min: 2, max: 60 }), (at, temp, st, pieces) => {
      const start: Haggling = { eggId: 'e', name: 'N', breakfastHour: 3, dinnerHour: 4, bedHour: 5, hunger: 40, mood: 80, energy: 80, mess: 10, healthXp: 50, lifeXp: 0, lastTickAt: new Date(at).toISOString(), scrapbook: [], livingOn: 'phone' }
      const end = at + 6 * HOUR
      const once = tick(start, { temperamentId: temp, nowMs: end, stage: st }).haggling
      let many = start
      for (let i = 1; i <= pieces; i++) many = tick(many, { temperamentId: temp, nowMs: at + (6 * HOUR * i) / pieces, stage: st }).haggling
      for (const b of BARS) {
        assert.ok(Math.abs(once[b] - many[b]) <= 3, `${b}: one tick ${once[b]}, ${pieces} ticks ${many[b]}`)
      }
    }),
    RUNS,
  )
})

// ---------------------------------------------------------------- Photo Treat

test('P6 a Photo Treat fills every bar, clears Mess, +50 Life XP, and only once a day (photo-care R2.1, R2.2)', () => {
  fc.assert(
    fc.property(time, temperament, stage, fc.integer({ min: 0, max: 600 }), (at, temp, st, laterMins) => {
      const noon = Math.floor(at / DAY) * DAY + 11 * HOUR
      const h: Haggling = { eggId: 'e', name: 'N', breakfastHour: 8, dinnerHour: 18, bedHour: 21, hunger: 10, mood: 10, energy: 10, mess: 90, healthXp: 0, lifeXp: 7, lastTickAt: new Date(noon).toISOString(), scrapbook: [], livingOn: 'phone' }
      const ctx = { temperamentId: temp, nowMs: noon, stage: st }
      const first = applyPhotoTreat(h, 'shortbread', ctx)
      assert.ok(first.accepted)
      const t = first.haggling
      assert.deepEqual([t.hunger, t.mood, t.energy, t.mess], [100, 100, 100, 0])
      assert.equal(t.lifeXp, 7 + RULES.lifeXpPhotoTreat)
      const again = applyPhotoTreat(t, 'heather', { ...ctx, nowMs: noon + Math.min(laterMins, 11 * 60) * 60_000 })
      assert.equal(again.accepted, false)
    }),
    RUNS,
  )
})

// ---------------------------------------------------------------- Sleep

test('P7 asleep: cuddles and cleaning do not wake them; feed, walk, treat or play wake them crabbit (care-sleep R4)', () => {
  fc.assert(
    fc.property(time, temperament, stage, action, (at, temp, st, a) => {
      fc.pre(a !== 'sleep' && a !== 'scold')
      const h: Haggling = { eggId: 'e', name: 'N', breakfastHour: 8, dinnerHour: 18, bedHour: 21, hunger: 80, mood: 60, energy: 50, mess: 10, healthXp: 50, lifeXp: 0, lastTickAt: new Date(at).toISOString(), asleepUntil: new Date(at + 5 * HOUR).toISOString(), scrapbook: [], livingOn: 'phone' }
      const out = applyCare(h, a, { temperamentId: temp, nowMs: at, stage: st }).haggling
      const woke = out.asleepUntil === undefined
      assert.equal(woke, RULES.wakesGrumpy.includes(a), `${a} woke=${woke}`)
      if (woke) assert.ok(out.scrapbook.some((e) => e.text.includes('crabbit')))
    }),
    RUNS,
  )
})

test('P8 missing bedtime while asleep never costs Health XP (care-sleep R5)', () => {
  fc.assert(
    fc.property(time, temperament, stage, fc.integer({ min: 0, max: 23 }), (at, temp, st, bedHour) => {
      const h: Haggling = { eggId: 'e', name: 'N', breakfastHour: (bedHour + 12) % 24, dinnerHour: (bedHour + 13) % 24, bedHour, hunger: 100, mood: 80, energy: 10, mess: 0, healthXp: 50, lifeXp: 0, lastTickAt: new Date(at).toISOString(), asleepUntil: new Date(at + 8 * HOUR).toISOString(), scrapbook: [], livingOn: 'phone' }
      const out = tick(h, { temperamentId: temp, nowMs: at + 7 * HOUR, stage: st }).haggling
      assert.ok(!out.scrapbook.some((e) => e.text.includes('Missed bedtime')), 'bedtime penalty while asleep')
    }),
    RUNS,
  )
})

// ---------------------------------------------------------------- Discipline and Haggis Run (GAME-DESIGN.md)

test('P9 telling off: fair costs Mood 5 and no Health XP; unfair costs Mood 15 and Health XP 3; Life XP never drops', () => {
  fc.assert(
    fc.property(time, temperament, stage, fc.uuid(), fc.integer({ min: 20, max: 100 }), fc.integer({ min: 10, max: 100 }), (at, temp, st, eggId, mood, healthXp) => {
      const h: Haggling = { eggId, name: 'N', breakfastHour: 8, dinnerHour: 18, bedHour: 21, hunger: 80, mood, energy: 80, mess: 10, healthXp, lifeXp: 100, lastTickAt: new Date(at).toISOString(), scrapbook: [], livingOn: 'phone' }
      const fair = isMisbehaving(h, temp, at)
      const out = applyCare(h, 'scold', { temperamentId: temp, nowMs: at, stage: st }).haggling
      assert.equal(out.mood, mood - (fair ? RULES.scoldMoodHit : RULES.unfairScoldMoodHit))
      assert.equal(out.healthXp, healthXp - (fair ? 0 : RULES.unfairScoldHealthHit))
      assert.ok((out.lifeXp ?? 0) >= 100)
      if (fair) assert.equal(isMisbehaving(out, temp, at), false, 'a fair telling-off stops the mischief this hour')
    }),
    RUNS,
  )
})

test('P10 mischief is the same on every device and for the whole hour', () => {
  fc.assert(
    fc.property(fc.uuid(), temperament, time, fc.integer({ min: 0, max: HOUR - 1 }), (eggId, temp, at, offset) => {
      const h = { eggId, name: 'N' } as Haggling
      const hourStart = Math.floor(at / HOUR) * HOUR
      assert.equal(isMisbehaving(h, temp, hourStart), isMisbehaving(h, temp, hourStart + offset))
      assert.equal(mischiefLine(h, hourStart), mischiefLine(h, hourStart + offset))
    }),
    RUNS,
  )
})

test('P11 mischief happens about as often as the temperament says (GAME-DESIGN.md: Douce 5% ... Fair Wud 35%)', () => {
  for (const temp of TEMPERAMENTS) {
    let hits = 0
    const n = 4000
    for (let i = 0; i < n; i++) {
      if (isMisbehaving({ eggId: `egg-${i}`, name: 'N' } as Haggling, temp, T0 + (i % 97) * HOUR)) hits++
    }
    const want = RULES.mischiefPerHour[temp]
    assert.ok(Math.abs((100 * hits) / n - want) <= 3, `${temp}: ${((100 * hits) / n).toFixed(1)}% vs ${want}%`)
  }
})

test('P12 Haggis Run: Mood rises by 4 per win (max 20), Energy drops 8, score is used once', () => {
  fc.assert(
    fc.property(time, temperament, stage, fc.integer({ min: -5, max: 20 }), bar, fc.integer({ min: 10, max: 100 }), (at, temp, st, wins, mood, energy) => {
      const h: Haggling = { eggId: 'e', name: 'N', breakfastHour: 8, dinnerHour: 18, bedHour: 21, hunger: 80, mood, energy, mess: 10, healthXp: 50, lifeXp: 0, lastTickAt: new Date(at).toISOString(), playScore: wins, scrapbook: [], livingOn: 'phone' }
      const out = applyCare(h, 'play', { temperamentId: temp, nowMs: at, stage: st }).haggling
      const w = Math.max(0, Math.min(5, wins))
      assert.equal(out.mood, Math.min(100, mood + w * RULES.playMoodPerWin))
      assert.equal(out.energy, Math.max(0, energy - RULES.playEnergyCost))
      assert.equal(out.playScore, undefined)
    }),
    RUNS,
  )
})

// ---------------------------------------------------------------- Weather (weather-mood)

test('P13 a weather slot changes a Haggling at most once, even with other slots in between (weather-mood R4.3)', () => {
  fc.assert(
    fc.property(time, temperament, haggling(T0), bucket, fc.array(fc.tuple(bucket, fc.string({ minLength: 1, maxLength: 12 })), { maxLength: 20 }), (at, temp, h0, b, others) => {
      const first = applyWeather(h0, b, '2026-11-17-am', temp, new Date(at).toISOString()).haggling
      let h = first
      for (const [ob, os] of others) h = applyWeather(h, ob, `x-${os}`, temp, new Date(at).toISOString()).haggling
      const again = applyWeather(h, b, '2026-11-17-am', temp, new Date(at).toISOString())
      assert.equal(again.applied, false, `slot re-applied after ${others.length} other slots`)
    }),
    RUNS,
  )
})

test('P14 one weather slot moves Mood at most 12 and Energy at most 6 (x1.3 for teens, x0.7 in old age), Hunger -6 to 0 (weather-mood R4.2)', () => {
  const swing = { baby: 1, child: 1, teen: 1.3, adult: 1, elder: 0.7 }
  fc.assert(
    fc.property(temperament, bucket, fc.option(bucket, { nil: undefined }), stage, (temp, b, prev, st) => {
      const h: Haggling = { eggId: 'e', name: 'N', breakfastHour: 8, dinnerHour: 18, bedHour: 21, hunger: 50, mood: 50, energy: 50, mess: 10, healthXp: 50, lifeXp: 0, lastTickAt: new Date(T0).toISOString(), weatherBucket: prev, scrapbook: [], livingOn: 'phone' }
      const r = applyWeather(h, b, '2026-11-17-am', temp, new Date(T0).toISOString(), undefined, swing[st])
      assert.ok(Math.abs(r.delta.mood) <= Math.round(12 * swing[st]), `mood ${r.delta.mood} (${temp}, ${prev}->${b}, ${st})`)
      assert.ok(Math.abs(r.delta.energy) <= Math.round(6 * swing[st]), `energy ${r.delta.energy} (${temp}, ${prev}->${b}, ${st})`)
      assert.ok(r.delta.hunger <= 0 && r.delta.hunger >= -6, `hunger ${r.delta.hunger}`)
    }),
    RUNS,
  )
})

test('P15 weather never changes Health XP or Life XP (weather-mood R4.5)', () => {
  fc.assert(
    fc.property(temperament, bucket, haggling(T0), fc.double({ min: 0.5, max: 1.5, noNaN: true }), (temp, b, h, sw) => {
      const r = applyWeather(h, b, 's', temp, new Date(T0).toISOString(), undefined, sw).haggling
      assert.equal(r.healthXp, h.healthXp)
      assert.equal(r.lifeXp, h.lifeXp)
    }),
    RUNS,
  )
})

// ---------------------------------------------------------------- Sync (sync-conflict)

const pair = fc.tuple(time, time).chain(([a, b]) => fc.tuple(haggling(a), haggling(b)))

test('P16 merge keeps the whole meter set from the later snapshot; a tie goes to the cloud (sync-conflict R3.2-R3.4)', () => {
  fc.assert(
    fc.property(pair, ([local, remote]) => {
      const out = mergeHaggling(local, remote)
      const winner = Date.parse(remote.lastTickAt) >= Date.parse(local.lastTickAt) ? remote : local
      for (const k of [...BARS, 'healthXp', 'lastTickAt'] as const) assert.deepEqual(out[k], winner[k], k)
    }),
    RUNS,
  )
})

test('P17 merge loses nothing: every scrapbook entry and weather slot survives, Life XP is the bigger one (sync-conflict R4.1, R4.3)', () => {
  const entry = fc.record({ id: fc.uuid(), at: time.map((t) => new Date(t).toISOString()), text: fc.string() })
  fc.assert(
    fc.property(pair, fc.array(entry, { maxLength: 15 }), fc.array(entry, { maxLength: 15 }), fc.array(fc.string(), { maxLength: 5 }), fc.array(fc.string(), { maxLength: 5 }), ([l, r], ls, rs, lw, rw) => {
      const local = { ...l, scrapbook: ls, weatherApplied: lw }
      const remote = { ...r, scrapbook: rs, weatherApplied: rw }
      const out = mergeHaggling(local, remote)
      const ids = new Set(out.scrapbook.map((e) => e.id))
      for (const e of [...ls, ...rs]) assert.ok(ids.has(e.id), 'scrapbook entry lost')
      for (const s of [...lw, ...rw]) assert.ok(out.weatherApplied?.includes(s), 'weather slot lost')
      assert.equal(out.lifeXp, Math.max(l.lifeXp ?? 0, r.lifeXp ?? 0))
    }),
    RUNS,
  )
})

test('P18 merging the same snapshot twice changes nothing more (merge is idempotent)', () => {
  fc.assert(
    fc.property(pair, ([local, remote]) => {
      const once = mergeHaggling(local, remote)
      assert.deepEqual(mergeHaggling(once, remote), once)
    }),
    RUNS,
  )
})

test('P19 traits come from the cloud: name, meal and bed hours never flip back (sync-conflict R6)', () => {
  fc.assert(
    fc.property(pair, ([local, remote]) => {
      const out = mergeHaggling(local, remote)
      for (const k of ['eggId', 'name', 'breakfastHour', 'dinnerHour', 'bedHour'] as const) assert.equal(out[k], remote[k], k)
    }),
    RUNS,
  )
})

// ---------------------------------------------------------------- Life (lifespan-graveyard)

test('P20 life only moves forward: stage, day and days-left never go backwards; never ends early (lifespan-graveyard R1.2, R2.4)', () => {
  fc.assert(
    fc.property(time, fc.integer({ min: 0, max: 50 * DAY }), fc.integer({ min: 0, max: 5 * DAY }), (born, a, gap) => {
      const bornAt = new Date(born).toISOString()
      const ends = new Date(born + 42 * DAY).toISOString()
      const x = lifeStatus(bornAt, ends, born + a)
      const y = lifeStatus(bornAt, ends, born + a + gap)
      const order = STAGES.map((s) => s.id)
      assert.ok(order.indexOf(y.stage) >= order.indexOf(x.stage))
      assert.ok(y.day >= x.day && y.daysLeft <= x.daysLeft)
      assert.equal(x.departed, a >= 42 * DAY)
      assert.equal(x.stage, [...STAGES].reverse().find((s) => x.day >= s.fromDay)!.id)
    }),
    RUNS,
  )
})

test('P21 levels: level only rises with XP, and XP always sits inside its level band (photo-care R5.5)', () => {
  fc.assert(
    fc.property(fc.integer({ min: 0, max: 20000 }), fc.integer({ min: 0, max: 2000 }), (xp, more) => {
      const a = lifeLevel(xp)
      const b = lifeLevel(xp + more)
      assert.ok(b.level >= a.level)
      assert.ok(a.xp >= a.levelStart && a.xp < a.nextAt)
      if (xp >= 100) assert.ok(a.level >= 2)
      if (xp >= 1000) assert.equal(a.level, 5 + Math.floor((xp - 1000) / 500))
    }),
    RUNS,
  )
})

test('P22 the growth film unlocks once and stays unlocked; demo eggs never wait longer (play-film R3, R4)', () => {
  fc.assert(
    fc.property(time, fc.integer({ min: 0, max: 3 * DAY }), fc.integer({ min: 0, max: DAY }), fc.boolean(), (hatched, a, gap, demo) => {
      const iso = new Date(hatched).toISOString()
      if (isPlayFilmUnlocked(iso, demo, hatched + a)) assert.ok(isPlayFilmUnlocked(iso, demo, hatched + a + gap))
      if (isPlayFilmUnlocked(iso, false, hatched + a)) assert.ok(isPlayFilmUnlocked(iso, true, hatched + a))
      assert.equal(isDemoEgg(demo, iso, iso), demo, 'the server flag always wins')
    }),
    RUNS,
  )
})

// ---------------------------------------------------------------- Identity (LIFE-STAGES.md)

test('P23 identity: off unless opted in, nothing before Teen, same answer every time, only "questioning" can change at Adult', () => {
  fc.assert(
    fc.property(fc.uuid(), fc.boolean(), fc.integer({ min: 0, max: 45 }), fc.integer({ min: 24, max: 45 }), (key, opted, day, adultDay) => {
      const now = identityAt(key, opted, day)
      assert.equal(now, identityAt(key, opted, day), 'not deterministic')
      if (!opted || day < 14) assert.equal(now, 'as-hatched')
      const teen = identityAt(key, opted, 14)
      const adult = identityAt(key, opted, adultDay)
      if (teen !== 'questioning') assert.equal(adult, teen, 'a settled teen identity changed')
    }),
    RUNS,
  )
})

test('P24 every identity outcome has a label when sex is known, and a warm message names the Haggling', () => {
  fc.assert(
    fc.property(fc.uuid(), fc.constantFrom('male' as const, 'female' as const), name, fc.integer({ min: 14, max: 45 }), (key, sex, n, day) => {
      const id = identityAt(key, true, day)
      assert.ok(identityLabel(sex, id).length > 0)
      const msg = identityMessage(n, sex, id)
      if (msg !== null) assert.ok(msg.includes(n))
    }),
    RUNS,
  )
})

// ---------------------------------------------------------------- Words on screen

test('P25 no template ever leaks "{name}", "{days}" or "undefined" into what the carer reads', () => {
  const leak = (s: string | null) => s !== null && /\{name\}|\{days\}|undefined|NaN/.test(s)
  fc.assert(
    fc.property(name, stage, action, bucket, temperament, fc.integer({ min: 0, max: 100 }), fc.integer({ min: 1, max: 42 }), time, (n, st, a, b, temp, mood, days, at) => {
      fc.pre(!/undefined|NaN|\{/.test(n))
      assert.ok(!leak(stageLine(st, a, n, at)), 'stageLine')
      assert.ok(!leak(weatherLine(n, b, temp)), 'weatherLine')
      assert.ok(!leak(epitaph(n, toneFor(mood), days)), 'epitaph')
      assert.ok(!leak(mischiefLine({ name: n } as Haggling, at)), 'mischiefLine')
    }),
    RUNS,
  )
})

test('P26 names with $ signs survive templates unchanged (String.replace special patterns)', () => {
  fc.assert(
    fc.property(fc.constantFrom('$&', "$'", '$`', '$$', 'Mo$&lly', '$1'), bucket, temperament, (n, b, temp) => {
      assert.ok(weatherLine(n, b, temp).includes(n), `weatherLine mangled ${n}`)
      assert.ok(epitaph(n, 'bright', 10).includes(n), `epitaph mangled ${n}`)
      assert.ok(mischiefLine({ name: n } as Haggling, T0).includes(n), `mischiefLine mangled ${n}`)
    }),
    RUNS,
  )
})

// ---------------------------------------------------------------- Robustness

test('P27 a damaged save (bad timestamps) never turns bars into NaN', () => {
  fc.assert(
    fc.property(temperament, stage, fc.constantFrom('', 'not a date', '2026-13-45T99:99:99Z'), action, (temp, st, badTime, a) => {
      const h: Haggling = { eggId: 'e', name: 'N', breakfastHour: 8, dinnerHour: 18, bedHour: 21, hunger: 50, mood: 50, energy: 50, mess: 10, healthXp: 50, lifeXp: 10, lastTickAt: badTime, scrapbook: [], livingOn: 'phone' }
      for (const out of [tick(h, { temperamentId: temp, nowMs: T0, stage: st }).haggling, applyCare(h, a, { temperamentId: temp, nowMs: T0, stage: st }).haggling]) {
        for (const b of BARS) assert.ok(Number.isFinite(out[b]), `${b}=${out[b]}`)
        assert.ok(Number.isFinite(out.lifeXp ?? 0), `lifeXp=${out.lifeXp}`)
        assert.ok(Number.isFinite(Date.parse(out.lastTickAt)), 'lastTickAt still bad')
      }
    }),
    { numRuns: 60 },
  )
})

// ---------------------------------------------------------------- Riddle (.kiro/specs/ai-haggling)

test('P29 a riddle guess changes Mood by +8 (right) or +2 (wrong), never Health XP, and only once a day (ai-haggling R5.5, R6.4)', () => {
  fc.assert(
    fc.property(time, temperament, stage, fc.boolean(), fc.integer({ min: 0, max: 90 }), fc.integer({ min: -50, max: 100 }), fc.integer({ min: 1, max: 600 }), (at, temp, st, right, mood, healthXp, laterMins) => {
      const noon = Math.floor(at / DAY) * DAY + 11 * HOUR
      const h: Haggling = { eggId: 'e', name: 'N', breakfastHour: 8, dinnerHour: 18, bedHour: 21, hunger: 80, mood, energy: 80, mess: 10, healthXp, lifeXp: 0, lastTickAt: new Date(noon).toISOString(), riddleCorrect: right, scrapbook: [], livingOn: 'phone' }
      const ctx = { temperamentId: temp, nowMs: noon, stage: st, timezone: 'Europe/London' }
      const once = applyCare(h, 'riddle', ctx).haggling
      assert.equal(once.mood, Math.min(100, mood + (right ? RULES.riddleMoodRight : RULES.riddleMoodWrong)))
      assert.equal(once.healthXp, healthXp + 0, 'riddle never touches Health XP')
      assert.equal(once.riddleCorrect, undefined)
      const again = applyCare({ ...once, riddleCorrect: true }, 'riddle', { ...ctx, nowMs: noon + Math.min(laterMins, 11 * 60) * 60_000 }).haggling
      assert.ok(again.mood <= once.mood, 'a second guess the same day gives nothing')
    }),
    RUNS,
  )
})
