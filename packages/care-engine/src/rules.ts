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
} as const
