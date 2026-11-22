/**
 * Every tunable care number lives here, once. Change a number here and every
 * surface (nest, phone, any future server job) changes together.
 * Values are ported unchanged from the Cursor-era storage.ts / health.ts.
 */
export const RULES = {
  /** Meter change per real hour. */
  decayPerHour: { hunger: 9, energy: 6, mess: 5, mood: 4 },
  /** Temperament multipliers on decay. */
  wildTemperaments: ['fair-wud', 'radge', 'ree'] as readonly string[],
  wildFactor: 1.15,
  calmTemperament: 'douce',
  calmFactor: 0.85,
  /** Below this many hours since the last tick, do nothing. */
  minTickHours: 0.02,

  /** A meal/bed window is missed when the meter is below this. */
  missedMealHungerBelow: 55,
  missedBedEnergyBelow: 45,
  missedMealMoodHit: 12,
  missedBedMoodHit: 10,
  /** Mood lost per awake hour spent hungry (Hunger below 25) or in a mess (Mess above 70). */
  lowHungerBelow: 25,
  lowHungerMoodHit: 3,
  highMessAbove: 70,
  highMessMoodHit: 4,

  /** Health XP. */
  messDirty: 55,
  penaltyHealth: 12,
  missScheduleHealth: 6,
  hungerZeroPenaltyHours: 12,
  moodZeroPenaltyHours: 24,
  messPenaltyHours: 12,
  frailBelow: 20,
  peakyBelow: 40,
  fairBelow: 70,
  amberAtOrBelow: 15,

  scrapbookMax: 40,

  /** Sleep (owner, 19 Nov): 8 hours; asleep it recovers energy and gets hungry slower. */
  sleepHours: 8,
  sleepEnergyPerHour: 8,
  sleepHungerFactor: 0.5,
  restedMoodBonus: 10,
  /** Woken early by being fed, walked or given a treat: grumpy. */
  grumpyMoodHit: 20,
  wakesGrumpy: ['feed', 'walk', 'treat', 'play'] as readonly string[],

  /** Mischief (owner, 22 Nov): chance per hour of misbehaving, by temperament. */
  mischiefPerHour: { douce: 5, skeigh: 10, 'ill-trickit': 30, ree: 20, radge: 30, 'fair-wud': 35 } as Record<string, number>,
  /** Scold: always costs mood; unfair scolding also costs Health XP. Life XP never drops. */
  scoldMoodHit: 5,
  unfairScoldMoodHit: 15,
  unfairScoldHealthHit: 3,
  /** Haggis Run: mood per correct guess (5 rounds), energy cost. */
  playMoodPerWin: 4,
  playEnergyCost: 8,

  /** Life XP (photo-care R5). */
  lifeXpPerDayAlive: 10,
  lifeXpPerCare: 1,
  lifeXpCareCapPerDay: 30,
  lifeXpPhotoTreat: 50,
  healthXpPhotoTreat: 20,
  /** Level thresholds: level 2 at 100, 3 at 300, 4 at 600, 5 at 1000, then +500. */
  levelThresholds: [0, 100, 300, 600, 1000] as readonly number[],
  levelStepAfter: 500,
} as const
