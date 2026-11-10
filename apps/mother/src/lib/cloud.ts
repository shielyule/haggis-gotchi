import { temperamentForChaos } from '../data/temperaments'
import { supabase, supabaseConfigured } from './supabase'
import type {
  EggRecord,
  Haggling,
  ScrapEntry,
  SignupAnswers,
} from './storage'

type EggRow = {
  id: string
  carer_id: string
  created_at: string
  ready_at: string
  status: EggRecord['status']
  story_id: string | null
  answers: SignupAnswers
}

type ChildRow = {
  id: string
  egg_id: string
  carer_id: string
  name: string
  temperament_id: string
  breakfast_hour: number
  dinner_hour: number
  bed_hour: number
  hunger: number
  mood: number
  energy: number
  mess: number
  living_on: 'mother' | 'phone'
  last_tick_at: string
  transfer_code: string | null
  transfer_expires_at: string | null
  created_at: string
}

type ScrapRow = {
  id: string
  child_id: string
  at: string
  text: string
}

export async function getSessionUserId(): Promise<string | null> {
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  return data.session?.user.id ?? null
}

export async function requireUserId(): Promise<string | null> {
  if (!supabaseConfigured || !supabase) return null
  return getSessionUserId()
}

/**
 * Register egg in cloud at claim time (works before magic-code login)
 * so the ready-email cron can fire at 3am with the browser closed.
 */
export async function registerEggInCloud(egg: EggRecord): Promise<void> {
  if (!supabaseConfigured || !supabase) return
  const { error } = await supabase.rpc('register_egg', {
    p_id: egg.id,
    p_ready_at: egg.readyAt,
    p_story_id: egg.storyId ?? null,
    p_answers: egg.answers,
  })
  if (error) console.error('registerEggInCloud', error.message)
}

/** Upsert egg row when signed in. */
export async function syncEggToCloud(egg: EggRecord): Promise<void> {
  if (!supabaseConfigured || !supabase) return

  const userId = await requireUserId()
  if (!userId) {
    await registerEggInCloud(egg)
    return
  }

  const { error } = await supabase.from('eggs').upsert(
    {
      id: egg.id,
      carer_id: userId,
      created_at: egg.createdAt,
      ready_at: egg.readyAt,
      status: egg.status,
      story_id: egg.storyId ?? null,
      answers: egg.answers,
      email: egg.answers.email?.trim().toLowerCase() || null,
    },
    { onConflict: 'id' },
  )
  if (error) console.error('syncEggToCloud', error.message)
}

/** Create/update child + replace scrapbook snapshot. */
export async function syncChildToCloud(egg: EggRecord): Promise<string | null> {
  const userId = await requireUserId()
  if (!userId || !supabase || !egg.haggling) return null

  await syncEggToCloud(egg)

  const h = egg.haggling
  const temp = temperamentForChaos(egg.answers.chaos)
  const payload = {
    egg_id: egg.id,
    carer_id: userId,
    name: h.name,
    temperament_id: temp.id,
    breakfast_hour: h.breakfastHour,
    dinner_hour: h.dinnerHour,
    bed_hour: h.bedHour,
    hunger: h.hunger,
    mood: h.mood,
    energy: h.energy,
    mess: h.mess,
    living_on: h.livingOn,
    last_tick_at: h.lastTickAt,
    transfer_code: h.transferCode ?? null,
    transfer_expires_at: h.sentToPhoneAt
      ? new Date(new Date(h.sentToPhoneAt).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
      : null,
  }

  let childId = h.cloudChildId
  if (childId) {
    const { error } = await supabase.from('children').update(payload).eq('id', childId)
    if (error) {
      console.error('syncChildToCloud update', error.message)
      return null
    }
  } else {
    const { data, error } = await supabase
      .from('children')
      .upsert(payload, { onConflict: 'egg_id' })
      .select('id')
      .single()
    if (error) {
      console.error('syncChildToCloud upsert', error.message)
      return null
    }
    childId = data.id as string
  }

  // Replace scrapbook for this child (simple v1)
  await supabase.from('scrapbook_entries').delete().eq('child_id', childId)
  if (h.scrapbook.length) {
    const rows = h.scrapbook.slice(0, 40).map((s) => ({
      id: s.id,
      child_id: childId,
      carer_id: userId,
      at: s.at,
      text: s.text,
    }))
    const { error: scrapErr } = await supabase.from('scrapbook_entries').insert(rows)
    if (scrapErr) console.error('sync scrapbook', scrapErr.message)
  }

  return childId
}

export async function pushCheckIn(egg: EggRecord, surface: 'mother' | 'phone'): Promise<void> {
  const userId = await requireUserId()
  if (!userId || !supabase || !egg.haggling?.cloudChildId) return
  const h = egg.haggling
  const { error } = await supabase.from('check_ins').insert({
    child_id: h.cloudChildId,
    carer_id: userId,
    surface,
    hunger: h.hunger,
    mood: h.mood,
    energy: h.energy,
    mess: h.mess,
  })
  if (error) console.error('pushCheckIn', error.message)

  await supabase
    .from('children')
    .update({
      hunger: h.hunger,
      mood: h.mood,
      energy: h.energy,
      mess: h.mess,
      last_tick_at: h.lastTickAt,
      living_on: h.livingOn,
    })
    .eq('id', h.cloudChildId)
}

function childToHaggling(child: ChildRow, scraps: ScrapEntry[]): Haggling {
  return {
    eggId: child.egg_id,
    cloudChildId: child.id,
    name: child.name,
    breakfastHour: child.breakfast_hour,
    dinnerHour: child.dinner_hour,
    bedHour: child.bed_hour,
    hunger: child.hunger,
    mood: child.mood,
    energy: child.energy,
    mess: child.mess,
    healthXp: 50,
    lastCleanAt: child.last_tick_at,
    lastTickAt: child.last_tick_at,
    livingOn: child.living_on,
    transferCode: child.transfer_code ?? undefined,
    scrapbook: scraps,
  }
}

/** Pull this carer's brood from Supabase into EggRecord shape. */
export async function pullBroodFromCloud(): Promise<EggRecord[] | null> {
  const userId = await requireUserId()
  if (!userId || !supabase) return null

  // Attach any eggs claimed by this email before verify
  await supabase.rpc('claim_my_eggs_by_email')

  const { data: eggs, error } = await supabase
    .from('eggs')
    .select('*')
    .eq('carer_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('pullBroodFromCloud eggs', error.message)
    return null
  }

  const eggRows = (eggs ?? []) as EggRow[]
  if (eggRows.length === 0) return []

  const eggIds = eggRows.map((e) => e.id)
  const { data: children } = await supabase
    .from('children')
    .select('*')
    .in('egg_id', eggIds)

  const childRows = (children ?? []) as ChildRow[]
  const childIds = childRows.map((c) => c.id)
  let scrapRows: ScrapRow[] = []
  if (childIds.length) {
    const { data: scraps } = await supabase
      .from('scrapbook_entries')
      .select('*')
      .in('child_id', childIds)
      .order('at', { ascending: false })
    scrapRows = (scraps ?? []) as ScrapRow[]
  }

  const childByEgg = new Map(childRows.map((c) => [c.egg_id, c]))
  const scrapsByChild = new Map<string, ScrapEntry[]>()
  for (const s of scrapRows) {
    const list = scrapsByChild.get(s.child_id) ?? []
    list.push({ id: s.id, at: s.at, text: s.text })
    scrapsByChild.set(s.child_id, list)
  }

  return eggRows.map((egg) => {
    const child = childByEgg.get(egg.id)
    const record: EggRecord = {
      id: egg.id,
      createdAt: egg.created_at,
      readyAt: egg.ready_at,
      status: egg.status,
      storyId: egg.story_id ?? undefined,
      answers: egg.answers,
    }
    if (child) {
      record.haggling = childToHaggling(
        child,
        scrapsByChild.get(child.id) ?? [],
      )
    }
    return record
  })
}

/** Phone: load child by transfer code (must be signed in as owning carer). */
export async function claimChildByTransferCode(
  code: string,
): Promise<{ ok: true; egg: EggRecord } | { ok: false; error: string }> {
  const userId = await requireUserId()
  if (!userId || !supabase) {
    return { ok: false, error: 'Sign in with the same email you used on Mother first.' }
  }

  const cleaned = code.trim().toUpperCase()
  const { data: child, error } = await supabase
    .from('children')
    .select('*')
    .eq('transfer_code', cleaned)
    .eq('carer_id', userId)
    .maybeSingle()

  if (error) return { ok: false, error: error.message }
  if (!child) {
    return {
      ok: false,
      error: 'No Haggling for that code under this account. Check the code / email.',
    }
  }

  const row = child as ChildRow
  const { data: egg, error: eggErr } = await supabase
    .from('eggs')
    .select('*')
    .eq('id', row.egg_id)
    .single()

  if (eggErr || !egg) return { ok: false, error: 'Egg record missing in the cloud.' }

  const { data: scraps } = await supabase
    .from('scrapbook_entries')
    .select('*')
    .eq('child_id', row.id)
    .order('at', { ascending: false })

  await supabase
    .from('children')
    .update({ living_on: 'phone' })
    .eq('id', row.id)

  const eggRow = egg as EggRow
  const haggling = childToHaggling(
    { ...row, living_on: 'phone' },
    ((scraps ?? []) as ScrapRow[]).map((s) => ({
      id: s.id,
      at: s.at,
      text: s.text,
    })),
  )

  return {
    ok: true,
    egg: {
      id: eggRow.id,
      createdAt: eggRow.created_at,
      readyAt: eggRow.ready_at,
      status: eggRow.status,
      storyId: eggRow.story_id ?? undefined,
      answers: eggRow.answers,
      haggling,
    },
  }
}
