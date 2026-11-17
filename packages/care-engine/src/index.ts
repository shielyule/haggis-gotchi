export * from './types.ts'
export { RULES } from './rules.ts'
export {
  addScrap,
  applyHealthRules,
  careAlertFor,
  ensureHealth,
  healthLabel,
  newId,
  penaliseMissedSchedule,
  sootheHealth,
  type CareAlert,
} from './health.ts'
export {
  applyCare,
  applyPhotoTreat,
  clamp,
  dayKey,
  lifeLevel,
  ensureMeals,
  nearHour,
  tick,
  type EngineContext,
  type LifeLevel,
  type TreatResult,
} from './tick.ts'
export { mergeHaggling, timeOf } from './merge.ts'
