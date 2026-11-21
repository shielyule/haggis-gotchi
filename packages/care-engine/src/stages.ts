/**
 * What changes at each life stage. ONE table (docs/LIFE-STAGES.md, agreed 20 Nov 2026).
 * Pure; used by tick/applyCare/applyWeather on the phone and on the server.
 */
import type { StageId } from './life.ts'
import type { CareAction } from './types.ts'

type CareTweak = { mood?: number; energyCost?: number }

export type StageRule = {
  sleepHours: number
  /** Hunger/energy/mood decay multiplier. */
  decay: number
  /** Mess growth multiplier (teen bedrooms). */
  messGrowth: number
  /** Weather mood/energy swing multiplier. */
  weatherSwing: number
  care: Partial<Record<CareAction, CareTweak>>
  /** Teen: cuddles pushed away ("Really?!"), a small mood dip instead of a gain. */
  rejectsCuddles?: boolean
  lines: Partial<Record<CareAction, string[]>>
}

export const STAGE_RULES: Record<StageId, StageRule> = {
  baby: {
    sleepHours: 10, decay: 1, messGrowth: 1, weatherSwing: 1,
    care: { cuddle: { mood: 1.5 }, walk: { mood: 0.8 } },
    lines: {},
  },
  child: {
    sleepHours: 9, decay: 1, messGrowth: 1, weatherSwing: 1,
    care: { walk: { mood: 1.3 }, treat: { mood: 1.2 }, clean: { mood: 0.8 } },
    lines: {
      walk: ['{name} came back with a jam jar full of tadpoles and no shoes.', '{name} wants to play out until the street lights come on.'],
      clean: ['{name} grumbled the whole time you tidied. "It was FINE."'],
      treat: ['{name} wolfed the treat and asked for "just one more, please, pleeease".'],
    },
  },
  teen: {
    sleepHours: 10, decay: 1, messGrowth: 1.3, weatherSwing: 1.3,
    care: { walk: { mood: 1.5 }, treat: { mood: 1.5 } },
    rejectsCuddles: true,
    lines: {
      cuddle: ['{name} pushes you away. "Really?!"', '{name} squirms off. "Not in FRONT of people!"'],
      feed: ['{name} ate it standing at the fridge, then asked what\u2019s for tea.', '{name} inhaled it and grunted. That\u2019s teen for "thank you".'],
      walk: ['{name} walked three steps behind you so nobody would know you were together. Still loved it.'],
      treat: ['{name} pretended not to care about the treat, then ate it in one go.'],
      clean: ['You found four mugs and a sock under {name}\u2019s bed. The sock was crunchy.'],
      sleep: ['{name} says they\u2019re not even tired. Asleep in four minutes.'],
    },
  },
  adult: {
    sleepHours: 7, decay: 1, messGrowth: 1, weatherSwing: 1,
    care: { feed: { mood: 1.5 }, clean: { mood: 1.5 }, walk: { mood: 1.3 }, treat: { mood: 0.7 } },
    lines: {
      feed: ['That gourmet neeps and tatties with the creamy whisky sauce really was divine!', '{name} savoured every bite and said the haggis-free stovies were "a triumph".'],
      clean: ['{name} hoovered, then hoovered again. Very satisfying.', '{name} alphabetised the spice rack while you cleaned. Bliss.'],
      walk: ['{name} did the full hill loop and came back glowing and insufferable about it.'],
      treat: ['{name} had one treat, said "just the one", and meant it. Watching the waistline.'],
      sleep: ['{name} read three pages and was out like a light.'],
    },
  },
  elder: {
    sleepHours: 6, decay: 0.8, messGrowth: 1, weatherSwing: 0.7,
    care: { cuddle: { mood: 1.5 }, walk: { mood: 0.8, energyCost: 1.5 }, feed: { mood: 1.2 } },
    lines: {
      cuddle: ['{name} held on a wee bit longer than usual.'],
      walk: ['{name} made it to the end of the road and told everyone about it.', '{name}\u2019s knees creaked like the kirk door, but what a view.'],
      feed: ['{name} enjoyed the soft tatties and said they don\u2019t make neeps like they used to.'],
      sleep: ['{name} dozed off mid-sentence. It was a good sentence.'],
    },
  },
}

export function stageRule(stage: StageId | undefined): StageRule {
  return STAGE_RULES[stage ?? 'baby'] ?? STAGE_RULES.baby
}

/** Pick a stage line (varies by minute so repeats differ); null = keep the default line. */
export function stageLine(stage: StageId | undefined, action: CareAction, name: string, nowMs: number): string | null {
  const list = stageRule(stage).lines[action]
  if (!list?.length) return null
  return list[Math.floor(nowMs / 60_000) % list.length].replace(/\{name\}/g, name)
}

// ---------------------------------------------------------------------------
// Identity (agreed 20 Nov): random, opted-in carers only; no outcome scores better or worse.
// ---------------------------------------------------------------------------
export type Identity = 'as-hatched' | 'trans' | 'non-binary' | 'questioning'
export const IDENTITY_DAY_TEEN = 14 // start of Teen, so the demo "Next stage" shows it
export const IDENTITY_DAY_ADULT = 24 // start of Adult

function hash(s: string): number {
  let h = 2166136261
  for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0
  return h
}

/** Deterministic per Haggling, so phone and server agree. Weights are a first guess. */
export function identityAt(childKey: string, optedIn: boolean, day: number): Identity {
  if (!optedIn || day < IDENTITY_DAY_TEEN) return 'as-hatched'
  const r = hash(`${childKey}:teen`) % 100
  const teen: Identity = r < 40 ? 'as-hatched' : r < 65 ? 'trans' : r < 85 ? 'non-binary' : 'questioning'
  if (teen !== 'questioning' || day < IDENTITY_DAY_ADULT) return teen
  // Review 22 Nov: questioning is not a phase. Some stay questioning; the rest find their answer.
  const a = hash(`${childKey}:adult`) % 4
  return a === 0 ? 'questioning' : a === 1 ? 'as-hatched' : a === 2 ? 'trans' : 'non-binary'
}

/** What the care screen shows. A trans Haggling is simply the other one: a trans lassie is a lassie. */
export function identityLabel(sex: 'male' | 'female' | undefined, identity: Identity): string {
  if (identity === 'non-binary') return 'Non-binary'
  if (identity === 'questioning') return 'Questioning'
  if (!sex) return ''
  const flip = identity === 'trans'
  const male = flip ? sex === 'female' : sex === 'male'
  return male ? 'Laddie' : 'Lassie'
}

/** The moment the Haggling tells the carer (a warm line, no score). */
export function identityMessage(name: string, sex: 'male' | 'female' | undefined, identity: Identity): string | null {
  switch (identity) {
    case 'trans':
      return `${name} has something to tell you: "I'm a ${identityLabel(sex, identity).toLowerCase()}."`
    case 'non-binary':
      return `${name} has something to tell you: "I'm not a laddie or a lassie. I'm just me. Non-binary, and I go by they/them."`
    case 'questioning':
      return `${name} has something to tell you: "I'm still working out who I am."`
    default:
      return null
  }
}
