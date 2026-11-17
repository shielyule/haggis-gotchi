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
  carer_id: string | null
  email: string | null
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
  home_device_id: string | null
  health_xp: number | null
  life_xp: number | string | null
  last_treat_day: string | null
  weather_applied: string[] | null
  public_id: string | null
  share_enabled: boolean | null
}

/** Health XP column is -100..100; Life XP never below 0. */
function xpColumns(h: Haggling) {
  return {
    health_xp: Math.max(-100, Math.min(100, Math.round(h.healthXp ?? 50))),
    life_xp: Math.max(0, Math.round((h.lifeXp ?? 0) * 100) / 100),
    // weather-mood: applied slots (server keeps a union, never removes)
    weather_applied: h.weatherApplied ?? [],
  }
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

export type ClaimResult =
  | { ok: true; readyAt: string; slug: string }
  | { ok: false; error: string }

/**
 * Claim an egg through the claim-egg Edge Function (security-hardening T4).
 * Works before sign-in, so the ready email can arrive with the browser closed.
 * The server validates, runs the bot check and rate limits, and sets ready_at.
 */
export async function claimEggInCloud(
  egg: EggRecord,
  demo: boolean,
  turnstileToken: string,
): Promise<ClaimResult> {
  if (!supabaseConfigured || !supabase) {
    return { ok: false, error: 'Cloud is not configured on this build.' }
  }
  const { data, error } = await supabase.functions.invoke('claim-egg', {
    body: {
      eggId: egg.id,
      storyId: egg.storyId ?? null,
      demo,
      turnstileToken,
      answers: egg.answers,
    },
  })
  if (error) {
    // Non-2xx: the function's JSON message is on the response.
    const ctx = (error as { context?: Response }).context
    try {
      const body = (await ctx?.json()) as { error?: string } | undefined
      if (body?.error) return { ok: false, error: body.error }
    } catch {
      // fall through
    }
    return { ok: false, error: 'Could not reach the mother. Check your connection and try again.' }
  }
  const body = data as { ok?: boolean; readyAt?: string; slug?: string; error?: string }
  if (!body?.ok || !body.readyAt) return { ok: false, error: body?.error ?? 'Claim failed.' }
  return { ok: true, readyAt: body.readyAt, slug: body.slug ?? egg.answers.slug }
}

/** Update an existing egg's status (signed in). Eggs are only created by claim-egg. */
export async function syncEggToCloud(egg: EggRecord): Promise<void> {
  if (!supabaseConfigured || !supabase) return
  const userId = await requireUserId()
  if (!userId) return
  const { error } = await supabase.from('eggs').update({ status: egg.status }).eq('id', egg.id)
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
    last_tick_at: h.lastTickAt,
    ...xpColumns(h),
    // living_on, home_device_id, last_treat_day: server-only (RPCs / photo-treat)
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

/** What happened (public-feed). Weather check-ins never appear in the feed. */
export type CheckInAction = 'feed' | 'cuddle' | 'walk' | 'treat' | 'clean' | 'weather'

export async function pushCheckIn(
  egg: EggRecord,
  surface: 'mother' | 'phone',
  action?: CheckInAction,
): Promise<void> {
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
    action: action ?? null,
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
      ...xpColumns(h),
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
    healthXp: child.health_xp ?? 50,
    lifeXp: Number(child.life_xp ?? 0),
    lastTreatDay: child.last_treat_day ?? undefined,
    homeDeviceId: child.home_device_id ?? undefined,
    hatchedAt: child.created_at,
    publicId: child.public_id ?? undefined,
    shareEnabled: child.share_enabled ?? true,
    weatherApplied: child.weather_applied ?? [],
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
      answers: { ...egg.answers, email: egg.email ?? '' },
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

export type MintResult =
  | { ok: true; code: string; expiresAt: string }
  | { ok: false; error: string }

/** Ask the server for a claim code (security-hardening T5). Signed-in owner only. */
export async function mintTransferCode(childId: string): Promise<MintResult> {
  if (!supabase) return { ok: false, error: 'Cloud is not configured on this build.' }
  if (!(await requireUserId())) {
    return { ok: false, error: 'Sign in on this nest first (the 6-digit email code), then try again.' }
  }
  const { data, error } = await supabase.rpc('mint_transfer_code', { p_child_id: childId })
  const row = (Array.isArray(data) ? data[0] : data) as { code?: string; expires_at?: string } | null
  if (error || !row?.code || !row.expires_at) {
    if (error) console.error('mintTransferCode', error.message)
    return { ok: false, error: 'Could not make a code just now. Try again in a moment.' }
  }
  return { ok: true, code: row.code, expiresAt: row.expires_at }
}

/** Where does the cloud say this Haggling lives? null when unknown/offline. */
export async function fetchLivingOn(childId: string): Promise<'mother' | 'phone' | null> {
  if (!supabase || !(await requireUserId())) return null
  const { data, error } = await supabase
    .from('children')
    .select('living_on')
    .eq('id', childId)
    .maybeSingle()
  if (error || !data) return null
  return (data as { living_on: 'mother' | 'phone' }).living_on
}

/** Bring a Haggling back from the phone to the nest. Owner only. */
export async function returnChildToNest(childId: string): Promise<boolean> {
  if (!supabase || !(await requireUserId())) return false
  const { data, error } = await supabase.rpc('return_child_to_nest', { p_child_id: childId })
  if (error) console.error('returnChildToNest', error.message)
  return data === true
}

/**
 * Phone: claim with a code (security-hardening T5). The server checks owner,
 * expiry and single use, locks after 5 wrong tries, and moves the Haggling to the
 * phone. Then we load that same child (never a copy).
 */
export async function claimChildByTransferCode(
  code: string,
): Promise<{ ok: true; egg: EggRecord } | { ok: false; error: string }> {
  if (!supabase || !(await requireUserId())) {
    return { ok: false, error: 'Sign in with the same email you used on the nest first.' }
  }

  const { data, error } = await supabase.rpc('claim_child_by_code', { p_code: code })
  const result = data as { ok?: boolean; child_id?: string; error?: string } | null
  if (error || !result) {
    if (error) console.error('claim_child_by_code', error.message)
    return { ok: false, error: 'Could not reach the mother. Try again in a moment.' }
  }
  if (!result.ok || !result.child_id) {
    return { ok: false, error: result.error ?? 'That code did not work.' }
  }

  const { data: child, error: childErr } = await supabase
    .from('children')
    .select('*')
    .eq('id', result.child_id)
    .single()
  if (childErr || !child) return { ok: false, error: 'Haggling record missing in the cloud.' }
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

  const eggRow = egg as EggRow
  return {
    ok: true,
    egg: {
      id: eggRow.id,
      createdAt: eggRow.created_at,
      readyAt: eggRow.ready_at,
      status: eggRow.status,
      storyId: eggRow.story_id ?? undefined,
      answers: { ...eggRow.answers, email: eggRow.email ?? '' },
      haggling: childToHaggling(
        row,
        ((scraps ?? []) as ScrapRow[]).map((s) => ({ id: s.id, at: s.at, text: s.text })),
      ),
    },
  }
}

/** phone-home R4-R5: make this device the Haggling's home (owner only, server side). */
export async function setHomeDevice(childId: string, deviceId: string): Promise<boolean> {
  if (!supabase || !(await requireUserId())) return false
  const { data, error } = await supabase.rpc('set_home_device', {
    p_child_id: childId,
    p_device_id: deviceId,
  })
  if (error) console.error('set_home_device', error.message)
  return data === true
}

/** Which device is home right now (null when unknown/offline). */
export async function fetchHomeDevice(childId: string): Promise<string | null | undefined> {
  if (!supabase || !(await requireUserId())) return undefined
  const { data, error } = await supabase
    .from('children')
    .select('home_device_id')
    .eq('id', childId)
    .maybeSingle()
  if (error || !data) return undefined
  return (data as { home_device_id: string | null }).home_device_id
}

export type TreatResponse =
  | {
      ok: true
      treat: string
      treatId?: string | null
      confidence?: number | null
      seen?: string[]
      line?: string
      placeholder: boolean
      child: {
        hunger: number
        mood: number
        energy: number
        mess: number
        health_xp: number
        life_xp: number
        last_treat_day: string
        last_tick_at: string
      }
      scrap?: { id: string; at: string; text: string }
    }
  | { ok: false; error: string }

/** photo-care R1-R2: send the shrunk photo; the server decides the reward. */
export async function sendPhotoTreat(
  childId: string,
  deviceId: string,
  timezone: string,
  photo: Blob,
): Promise<TreatResponse> {
  if (!supabase || !(await requireUserId())) return { ok: false, error: 'Sign in first.' }
  const form = new FormData()
  form.append('childId', childId)
  form.append('deviceId', deviceId)
  form.append('timezone', timezone)
  form.append('photo', photo, 'treat.jpg')
  const { data, error } = await supabase.functions.invoke('photo-treat', { body: form })
  if (error) {
    const ctx = (error as { context?: Response }).context
    try {
      const body = (await ctx?.json()) as { error?: string } | undefined
      if (body?.error) return { ok: false, error: body.error }
    } catch {
      // fall through
    }
    return { ok: false, error: 'Could not reach the mother. Try again in a moment.' }
  }
  return data as TreatResponse
}

export type ReadingRow = { slot_id: string; bucket: string; temp_c: number | null; place: string; at: string }

/** weather-mood: the newest readings the weather-tick job recorded for this carer. */
export async function fetchRecentReadings(): Promise<ReadingRow[] | null> {
  if (!supabase || !(await requireUserId())) return null
  const { data, error } = await supabase
    .from('weather_readings')
    .select('slot_id, bucket, temp_c, place, at')
    .order('at', { ascending: false })
    .limit(3)
  if (error) return null
  return (data ?? []) as ReadingRow[]
}

/** weather-mood R1: save consent + coarse location (null = home place). Server rounds too. */
export async function saveWeatherLocation(lat: number | null, lon: number | null, timezone: string) {
  if (!supabase || !(await requireUserId())) return false
  const { data, error } = await supabase.rpc('set_weather_location', {
    p_lat: lat,
    p_lon: lon,
    p_timezone: timezone,
  })
  if (error) console.error('set_weather_location', error.message)
  return data === true
}

/** share-card R7: switch the public card on or off (owner; RLS). */
export async function setShareEnabled(childId: string, on: boolean): Promise<boolean> {
  if (!supabase || !(await requireUserId())) return false
  const { error } = await supabase.from('children').update({ share_enabled: on }).eq('id', childId)
  if (error) console.error('setShareEnabled', error.message)
  return !error
}

/** share-card: fetch the public id (made by the server at hatch). */
export async function fetchShareInfo(childId: string): Promise<{ publicId: string; on: boolean } | null> {
  if (!supabase || !(await requireUserId())) return null
  const { data } = await supabase.from('children').select('public_id, share_enabled').eq('id', childId).maybeSingle()
  const row = data as { public_id: string | null; share_enabled: boolean } | null
  return row?.public_id ? { publicId: row.public_id, on: row.share_enabled } : null
}

export type FeedRow = { carer_name: string; haggling_name: string; action: string; treat_id?: string | null; at: string }

/** public-feed: last 10 brood events. Public (no sign-in); names and actions only. */
export async function fetchPublicFeed(): Promise<FeedRow[] | null> {
  if (!supabase) return null
  const { data, error } = await supabase.rpc('public_feed')
  if (error) return null
  return (data ?? []) as FeedRow[]
}

/** public-feed R4-R5: the carer's tick box. */
export async function saveShowInFeed(show: boolean): Promise<boolean> {
  if (!supabase || !(await requireUserId())) return false
  const { data, error } = await supabase.rpc('set_show_in_feed', { p_show: show })
  if (error) console.error('set_show_in_feed', error.message)
  return data === true
}

export async function fetchShowInFeed(): Promise<boolean | null> {
  const uid = await requireUserId()
  if (!supabase || !uid) return null
  const { data } = await supabase.from('carers').select('show_in_feed').eq('id', uid).maybeSingle()
  return (data as { show_in_feed?: boolean } | null)?.show_in_feed ?? null
}
