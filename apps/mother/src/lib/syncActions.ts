import {
  pushCheckIn,
  registerEggInCloud,
  syncChildToCloud,
  syncEggToCloud,
} from './cloud'
import {
  careAction,
  carePhoneAction,
  claimEgg,
  loadPhoneStore,
  loadStore,
  mintPhoneTransfer,
  nameHaggling,
  savePhoneStore,
  setEggStatus,
  updateEggCloudChildId,
  type CareAction,
  type EggRecord,
  type SignupAnswers,
} from './storage'

export async function claimEggSynced(
  answers: SignupAnswers,
  waitMs?: number,
): Promise<EggRecord> {
  const egg = claimEgg(answers, waitMs)
  // Always register for cron ready-email (even before OTP login)
  await registerEggInCloud(egg)
  await syncEggToCloud(egg)
  return egg
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

export async function mintPhoneTransferSynced(eggId: string) {
  const minted = mintPhoneTransfer(eggId)
  if (!minted) return null
  const egg = loadStore().eggs.find((e) => e.id === eggId)
  if (egg) {
    const childId = await syncChildToCloud(egg)
    if (childId) updateEggCloudChildId(eggId, childId)
  }
  return minted
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
