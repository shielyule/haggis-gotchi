import {
  claimEggInCloud,
  fetchLivingOn,
  mintTransferCode,
  pushCheckIn,
  returnChildToNest,
  syncChildToCloud,
  syncEggToCloud,
  type MintResult,
} from './cloud'
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
  setLivingOn,
  setTransferCode,
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
  if (childId) updateEggCloudChildId(eggId, childId)
  return loadStore().eggs.find((e) => e.id === eggId) ?? null
}

/** Get a server-minted claim code for the phone. Needs sign-in on the nest. */
export async function mintPhoneTransferSynced(eggId: string): Promise<MintResult> {
  let egg = loadStore().eggs.find((e) => e.id === eggId)
  if (!egg?.haggling) return { ok: false, error: 'Name your Haggling first.' }
  if (!egg.haggling.cloudChildId) {
    const childId = await syncChildToCloud(egg)
    if (childId) updateEggCloudChildId(eggId, childId)
    egg = loadStore().eggs.find((e) => e.id === eggId)
  }
  const childId = egg?.haggling?.cloudChildId
  if (!childId) {
    return { ok: false, error: 'Sign in on this nest first (the 6-digit email code), then try again.' }
  }
  const minted = await mintTransferCode(childId)
  if (minted.ok) setTransferCode(eggId, minted.code)
  return minted
}

/** Ask the cloud where the Haggling lives and mirror it locally. */
export async function refreshLivingOn(eggId: string): Promise<EggRecord | null> {
  const egg = loadStore().eggs.find((e) => e.id === eggId)
  const childId = egg?.haggling?.cloudChildId
  if (!childId) return egg ?? null
  const where = await fetchLivingOn(childId)
  if (where) setLivingOn(eggId, where)
  return loadStore().eggs.find((e) => e.id === eggId) ?? null
}

/** Bring the Haggling back from the phone to this nest. */
export async function returnToNestSynced(eggId: string): Promise<boolean> {
  const egg = loadStore().eggs.find((e) => e.id === eggId)
  const childId = egg?.haggling?.cloudChildId
  if (!childId) return false
  const ok = await returnChildToNest(childId)
  if (ok) {
    setTransferCode(eggId, undefined)
    setLivingOn(eggId, 'mother')
  }
  return ok
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
    if (fresh) await pushCheckIn(fresh, surface)
  }
  return loadStore().eggs.find((e) => e.id === eggId) ?? null
}

export async function carePhoneActionSynced(
  action: CareAction,
): Promise<EggRecord | null> {
  carePhoneAction(action)
  const egg = loadPhoneStore().child
  if (egg?.haggling) {
    await pushCheckIn(egg, 'phone')
    // Keep phone-local scrapbook if cloud push updated nothing else
    savePhoneStore({ child: loadPhoneStore().child })
  }
  return loadPhoneStore().child
}
