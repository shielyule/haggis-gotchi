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
import { supabaseConfigured } from './supabase'
import {
  careAction,
  carePhoneAction,
  loadPhoneStore,
  loadStore,
  nameHaggling,
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

export const DEMO_WAIT_MS = 90 * 1000
export const FULL_WAIT_MS = 30 * 60 * 1000

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
  const draft = newEggRecord(answers, demo ? DEMO_WAIT_MS : FULL_WAIT_MS)
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
): Promise<EggRecord | null> {
  nameHaggling(eggId, name, breakfastHour, dinnerHour, bedHour)
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
  | { ok: false; error: string }
> {
  const egg = loadStore().eggs.find((e) => e.id === eggId)
  const childId = egg?.haggling?.cloudChildId
  if (!childId) return { ok: false, error: 'Sign in first, so the mother knows this Haggling.' }
  const res = await sendPhotoTreat(childId, getDeviceId(), deviceTimezone(), photo)
  if (!res.ok) return res
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
