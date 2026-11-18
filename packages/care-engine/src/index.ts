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
export {
  applyWeather,
  classifyWeather,
  HOME_PLACES,
  homePlace,
  slotId,
  TEMPERAMENT_WEATHER,
  WEATHER_BASE,
  WEATHER_BUCKETS,
  WEATHER_LABEL,
  weatherDelta,
  weatherLine,
  type WeatherApplied,
  type WeatherBucket,
  type WeatherReading,
} from './weather.ts'
export {
  DEMO_WAIT_MAX_MS,
  isDemoEgg,
  isPlayFilmUnlocked,
  PLAY_FILM_DELAY_MS,
  PLAY_FILM_DEMO_DELAY_MS,
  playFilmUnlockAt,
} from './films.ts'
export { epitaph, LIFESPAN_DAYS, lifeStatus, STAGES, toneFor, type LifeStatus, type StageId, type Tone } from './life.ts'
