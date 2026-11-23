import {
  claimEggInCloud,
  fetchHomeDevice,
  pushCheckIn,
  sendPhotoTreat,
  setHomeDevice,
  syncChildToCloud,
  syncEggToCloud,
} from './cloud'
import { deviceTimezone, getDeviceId } from './device'
import { addScrap } from './engine'
import { supabase, supabaseConfigured } from './supabase'
import {
  careAction,
  carePhoneAction,
  loadPhoneStore,
  loadStore,
  nameHaggling,
  replaceHaggling,
  newEggRecord,
  savePhoneStore,
  saveNewEgg,
  setEggStatus,
  applyTreatLocal,
  setHomeDeviceLocal,
  updateEggCloudChildId,
  type CareAction,
  type EggRecord,
  type SignupAnswers,
} from './storage'

export const DEMO_WAIT_MS = 10 * 1000 // owner, 20 Nov
export const FULL_WAIT_MS = 20 * 1000

/**
 * Claim an egg. The cloud must accept it first (bot check, validation, rate
 * limits); only then is it saved in this browser, with the server's ready time.
 * Without cloud config (local dev only) it stays local.
 */
export async function claimEggSynced(
  answers: SignupAnswers,
  demo: boolean,
  turnstileToken: string,
): Promise<{ ok: true; egg: EggRecord } | { ok: false; error: string }> {
  const draft = { ...newEggRecord(answers, demo ? DEMO_WAIT_MS : FULL_WAIT_MS), demo }
  if (!supabaseConfigured) return { ok: true, egg: saveNewEgg(draft) }

  const result = await claimEggInCloud(draft, demo, turnstileToken)
  if (!result.ok) return result
  const egg = saveNewEgg({
    ...draft,
    readyAt: result.readyAt,
    answers: { ...draft.answers, slug: result.slug },
  })
  return { ok: true, egg }
}

export async function setEggStatusSynced(
  id: string,
  status: EggRecord['status'],
): Promise<EggRecord | null> {
  const egg = setEggStatus(id, status)
  if (egg) await syncEggToCloud(egg)
  return egg
}

export async function nameHagglingSynced(
  eggId: string,
  name: string,
  breakfastHour: number,
  dinnerHour: number,
  bedHour: number,
  sex?: 'male' | 'female',
): Promise<EggRecord | null> {
  nameHaggling(eggId, name, breakfastHour, dinnerHour, bedHour, sex)
  const egg = loadStore().eggs.find((e) => e.id === eggId) ?? null
  if (!egg) return null
  const childId = await syncChildToCloud(egg)
  if (childId) {
    updateEggCloudChildId(eggId, childId)
    // phone-home R4.2: the device that names the Haggling is its home.
    const device = getDeviceId()
    if (await setHomeDevice(childId, device)) setHomeDeviceLocal(eggId, device)
  }
  return loadStore().eggs.find((e) => e.id === eggId) ?? null
}

/** phone-home R5: make this device the Haggling's home. Never copies. */
export async function moveHereSynced(eggId: string): Promise<boolean> {
  const childId = loadStore().eggs.find((e) => e.id === eggId)?.haggling?.cloudChildId
  if (!childId) return false
  const device = getDeviceId()
  const ok = await setHomeDevice(childId, device)
  if (ok) setHomeDeviceLocal(eggId, device)
  return ok
}

/** Ask the server which device is home; mirror it. Returns true when THIS device is home. */
export async function refreshHomeDevice(eggId: string): Promise<boolean | null> {
  const childId = loadStore().eggs.find((e) => e.id === eggId)?.haggling?.cloudChildId
  if (!childId) return null
  const home = await fetchHomeDevice(childId)
  if (home === undefined) return null
  setHomeDeviceLocal(eggId, home)
  return !home || home === getDeviceId()
}

/** photo-care: send the photo, apply the server's reward locally. */
export async function photoTreatSynced(
  eggId: string,
  photo: Blob,
): Promise<
  | { ok: true; line: string; placeholder: boolean; treat: string; confidence: number | null }
  | { ok: false; error: string; reaction?: string; hint?: string }
> {
  const egg = loadStore().eggs.find((e) => e.id === eggId)
  const childId = egg?.haggling?.cloudChildId
  if (!childId) return { ok: false, error: 'Sign in first, so the mother knows this Haggling.' }
  const res = await sendPhotoTreat(childId, getDeviceId(), deviceTimezone(), photo)
  if (!res.ok) {
    // ai-haggling R4: "What's that?" The reaction goes in the scrapbook; bars unchanged.
    if (res.reactionScrap) addScrapLocal(eggId, res.reactionScrap)
    return res
  }
  applyTreatLocal(eggId, res.child, res.scrap)
  return {
    ok: true,
    line: res.line ?? res.scrap?.text ?? 'Photo Treat!',
    placeholder: res.placeholder,
    treat: res.treat,
    confidence: res.confidence ?? null,
  }
}

export async function careActionSynced(
  eggId: string,
  action: CareAction,
  surface: 'mother' | 'phone' = 'mother',
): Promise<EggRecord | null> {
  careAction(eggId, action)
  const egg = loadStore().eggs.find((e) => e.id === eggId) ?? null
  if (egg?.haggling) {
    if (!egg.haggling.cloudChildId) {
      const childId = await syncChildToCloud(egg)
      if (childId) updateEggCloudChildId(eggId, childId)
    }
    const fresh = loadStore().eggs.find((e) => e.id === eggId)
    if (fresh) await pushCheckIn(fresh, surface, action)
  }
  return loadStore().eggs.find((e) => e.id === eggId) ?? null
}

export async function carePhoneActionSynced(
  action: CareAction,
): Promise<EggRecord | null> {
  carePhoneAction(action)
  const egg = loadPhoneStore().child
  if (egg?.haggling) {
    await pushCheckIn(egg, 'phone', action)
    // Keep phone-local scrapbook if cloud push updated nothing else
    savePhoneStore({ child: loadPhoneStore().child })
  }
  return loadPhoneStore().child
}

/** Put a page the server wrote (diary, photo reaction, riddle) into this phone's scrapbook too. */
export function addScrapLocal(eggId: string, scrap: { id: string; at: string; text: string; kind?: string }): void {
  const egg = loadStore().eggs.find((e) => e.id === eggId)
  if (!egg?.haggling || egg.haggling.scrapbook.some((s) => s.id === scrap.id)) return
  const next = structuredClone(egg.haggling)
  next.scrapbook = [scrap, ...next.scrapbook].slice(0, 40)
  replaceHaggling(eggId, next)
}

/** ai-haggling R5.5: the server marked the guess; the engine gives the Mood. */
export async function riddleGuessedSynced(eggId: string, correct: boolean, scrap?: { id: string; at: string; text: string; kind?: string }) {
  if (scrap) addScrapLocal(eggId, scrap)
  const egg = loadStore().eggs.find((e) => e.id === eggId)
  if (egg?.haggling) replaceHaggling(eggId, { ...egg.haggling, riddleCorrect: correct })
  return careActionSynced(eggId, 'riddle', 'phone')
}

/** Identity moment (review 22 Nov): the carer may give their Haggling a new name, chosen together. */
export async function renameHagglingSynced(eggId: string, name: string): Promise<boolean> {
  const clean = name.trim().slice(0, 30)
  const egg = loadStore().eggs.find((e) => e.id === eggId)
  if (!clean || !egg?.haggling) return false
  const old = egg.haggling.name
  const next = structuredClone(egg.haggling)
  next.name = clean
  addScrap(next, `${old} chose a new name: ${clean}. It suits them.`)
  replaceHaggling(eggId, next)
  if (supabase && next.cloudChildId) {
    const { error } = await supabase.from('children').update({ name: clean }).eq('id', next.cloudChildId)
    if (error) console.error('rename', error.message)
  }
  return true
}
