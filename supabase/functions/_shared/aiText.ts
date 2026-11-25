/**
 * AI words for the Haggling (spec ai-haggling R3, R4, R6). Pure: tested under node, used by
 * the diary and photo-treat Edge Functions. The AI never sees emails, carer names,
 * coordinates or anything the carer typed except the Haggling's name.
 */

// ---------------------------------------------------------------- safety checks

/** Same words as public.feed_blocklist, plus drink (AI lines stay drink-free for every age). */
export const BLOCKED = ['bastard', 'bitch', 'cunt', 'fuck', 'piss', 'shit', 'twat', 'wank', 'whisky', 'whiskey', 'beer', 'wine', 'vodka', 'drunk', 'booze', 'pint', 'dram', 'kill', 'dead', 'die']

/** The name as a whole word, any case. Letters, digits and apostrophes either side do not count ("s" is not in "she's"). */
export function wholeWord(name: string, flags = ''): RegExp {
  const esc = name.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(?<![\\p{L}\\p{N}'\u2019])${esc}(?![\\p{L}\\p{N}'\u2019])`, `u${flags}`)
}

/** Gendered words the AI must not use for the Haggling (they/them or the name only). */
export const GENDERED = ['he', "he's", 'him', 'his', 'himself', 'she', "she's", 'her', 'hers', 'herself']

/** Names go into prompts: letters, spaces, apostrophes and hyphens only, 30 characters. */
export function safeName(raw: string): string {
  const s = String(raw ?? '').replace(/[^\p{L}\p{N} '-]+/gu, ' ').replace(/\s+/g, ' ').trim().slice(0, 30).trim()
  // A name needs at least one letter or digit ("-" alone is not a name; PBT S15, 25 Nov).
  return /[\p{L}\p{N}]/u.test(s) ? s : 'Wee Yin'
}

/** Tidy what the model sends back: quotes, markdown, labels, extra spaces. Never adds words. */
export function cleanAiLine(raw: string): string {
  return String(raw ?? '')
    .replace(/[*_#`>]/g, '')
    .replace(/^\s*(diary( entry)?|entry|reaction|answer)\s*:\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^["'\u201C\u2018]+|["'\u201D\u2019]+$/g, '')
    .trim()
}

/** R3.6 / R4.3: is this line safe and on-brief? `name` must appear; blocked words are checked outside the name. */
export function checkLine(text: string, name: string, max: number): boolean {
  const t = String(text ?? '')
  if (t.length < 10 || t.length > max) return false
  const lower = t.toLowerCase()
  // The name counts only as a whole word: a Haggling called "t" must not delete every t (PBT S16, 25 Nov).
  if (!/[\p{L}\p{N}]/u.test(name)) return false
  const nameRe = wholeWord(name)
  if (!nameRe.test(lower)) return false
  const withoutName = lower.replace(wholeWord(name, 'g'), ' ')
  const words = withoutName.split(/[^a-z']+/)
  if (BLOCKED.some((b) => words.includes(b) || words.some((w) => w.startsWith(b) && b.length >= 4 && !['killie', 'diet', 'drama', 'dramatic', 'deadly'].includes(w)))) return false
  // Checked outside the name: a Haggling called "00000" is fine (PBT S16, 24 Nov).
  if (/https?:|www\.|\.com\b|@/.test(withoutName)) return false
  if (/\d{5,}/.test(withoutName)) return false
  if (/[{}<>]/.test(t)) return false
  // Every Haggling is "they/them" or their name (identity design, 20 Nov). Found live 25 Nov: "he's bouncin".
  if (GENDERED.some((g) => words.includes(g))) return false
  const sentences = t.split(/[.!?]+(\s|$)/).filter((s) => s.trim().length > 2).length
  return sentences >= 1 && sentences <= 3
}

// ---------------------------------------------------------------- place (R3.3)

/** Rough-area towns. Coordinates are town centres, rounded. */
export const TOWNS: { name: string; lat: number; lon: number }[] = [
  { name: 'Glasgow', lat: 55.86, lon: -4.25 }, { name: 'Edinburgh', lat: 55.95, lon: -3.19 },
  { name: 'Aberdeen', lat: 57.15, lon: -2.1 }, { name: 'Dundee', lat: 56.46, lon: -2.97 },
  { name: 'Inverness', lat: 57.48, lon: -4.22 }, { name: 'Perth', lat: 56.4, lon: -3.43 },
  { name: 'Stirling', lat: 56.12, lon: -3.94 }, { name: 'Oban', lat: 56.41, lon: -5.47 },
  { name: 'Fort William', lat: 56.82, lon: -5.11 }, { name: 'Aviemore', lat: 57.19, lon: -3.83 },
  { name: 'Ayr', lat: 55.46, lon: -4.63 }, { name: 'Dumfries', lat: 55.07, lon: -3.6 },
  { name: 'Paisley', lat: 55.85, lon: -4.42 }, { name: 'Kilmarnock', lat: 55.61, lon: -4.5 },
  { name: 'St Andrews', lat: 56.34, lon: -2.8 }, { name: 'Kirkcaldy', lat: 56.11, lon: -3.16 },
  { name: 'Dunfermline', lat: 56.07, lon: -3.45 }, { name: 'Falkirk', lat: 56.0, lon: -3.78 },
  { name: 'Elgin', lat: 57.65, lon: -3.32 }, { name: 'Wick', lat: 58.44, lon: -3.09 },
  { name: 'Thurso', lat: 58.59, lon: -3.52 }, { name: 'Ullapool', lat: 57.9, lon: -5.16 },
  { name: 'Portree', lat: 57.41, lon: -6.19 }, { name: 'Stornoway', lat: 58.21, lon: -6.39 },
  { name: 'Kirkwall', lat: 58.98, lon: -2.96 }, { name: 'Lerwick', lat: 60.15, lon: -1.15 },
  { name: 'Peebles', lat: 55.65, lon: -3.19 }, { name: 'Hawick', lat: 55.42, lon: -2.79 },
  { name: 'Galashiels', lat: 55.62, lon: -2.81 }, { name: 'Campbeltown', lat: 55.42, lon: -5.6 },
  { name: 'Pitlochry', lat: 56.7, lon: -3.73 }, { name: 'Montrose', lat: 56.71, lon: -2.47 },
  { name: 'Newcastle', lat: 54.98, lon: -1.61 }, { name: 'Carlisle', lat: 54.89, lon: -2.93 },
  { name: 'Belfast', lat: 54.6, lon: -5.93 }, { name: 'Manchester', lat: 53.48, lon: -2.24 },
  { name: 'Leeds', lat: 53.8, lon: -1.55 }, { name: 'Liverpool', lat: 53.41, lon: -2.98 },
  { name: 'Birmingham', lat: 52.49, lon: -1.89 }, { name: 'Cardiff', lat: 51.48, lon: -3.18 },
  { name: 'Bristol', lat: 51.45, lon: -2.59 }, { name: 'London', lat: 51.51, lon: -0.13 },
  { name: 'Norwich', lat: 52.63, lon: 1.3 }, { name: 'Plymouth', lat: 50.38, lon: -4.14 },
  { name: 'Dublin', lat: 53.35, lon: -6.26 },
]
export const FAR_AWAY = 'far from the glens'

function km(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const r = (d: number) => (d * Math.PI) / 180
  const x = r(bLon - aLon) * Math.cos(r((aLat + bLat) / 2))
  const y = r(bLat - aLat)
  return Math.sqrt(x * x + y * y) * 6371
}

/** The nearest town within 80 km, else "far from the glens". Never returns coordinates. */
export function nearestTown(lat: number, lon: number): string {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return FAR_AWAY
  let best = { name: FAR_AWAY, d: Infinity }
  for (const t of TOWNS) {
    const d = km(lat, lon, t.lat, t.lon)
    if (d < best.d) best = { name: t.name, d }
  }
  return best.d <= 80 ? best.name : FAR_AWAY
}

/** Home-place labels look like "Oban (your home place)": keep the town. */
export function placeName(label: string | null | undefined): string {
  const s = String(label ?? '').replace(/\(.*?\)/g, '').trim()
  return s && s !== 'your area' && s.length <= 30 ? s : ''
}

// ---------------------------------------------------------------- the diary (R3)

export type DayWeather = { slot: 'am' | 'pm' | 'eve'; bucket: string; tempC: number | null }
export type DiaryInput = {
  name: string
  temperament: string
  temperamentNote: string
  stage: string
  day: number
  daysLeft: number
  place: string
  weather: DayWeather[]
  care: Partial<Record<string, number>>
  mood: number
  season?: string | null
  /** e.g. "became a Teen today". Written by us, never by the carer. */
  milestone?: string | null
}

const WEATHER_WORDS: Record<string, string> = {
  sunny: 'sunshine', crisp: 'a crisp clear sky', frost: 'frost', hot: 'heat', grey: 'a dreich grey sky',
  rain: 'rain', storm: 'a storm', snow: 'snow', windy: 'a wind blowing a hoolie', humid: 'close muggy air',
  fog: 'mist and fog', haar: 'the haar rolling in off the sea',
}
const CARE_WORDS: Record<string, string> = {
  feed: 'fed', cuddle: 'cuddled', walk: 'taken for a walk', treat: 'given a treat', clean: 'cleaned up after',
  play: 'played Haggis Run', scold: 'told off', sleep: 'put to bed', photo_treat: 'given a Photo Treat', riddle: 'set a riddle',
}

/** The day as plain facts, storm first (R3.5). No coordinates, emails or carer names exist here. */
export function diaryFacts(d: DiaryInput): string[] {
  const name = safeName(d.name)
  const facts: string[] = []
  const stormy = d.weather.some((w) => w.bucket === 'storm')
  if (stormy) facts.push(`A storm blew over ${d.place || 'the glen'} today.`)
  const seen = [...new Set(d.weather.map((w) => w.bucket))].filter((b) => !(stormy && b === 'storm'))
  if (seen.length) facts.push(`Weather today${d.place ? ` in ${d.place}` : ''}: ${seen.map((b) => WEATHER_WORDS[b] ?? b).join(', then ')}.`)
  const temps = d.weather.map((w) => w.tempC).filter((t): t is number => typeof t === 'number' && Number.isFinite(t))
  if (temps.length) facts.push(`Temperature about ${Math.round(Math.min(...temps))} to ${Math.round(Math.max(...temps))} degrees C.`)
  const care = Object.entries(d.care).filter(([, n]) => (n ?? 0) > 0).map(([a, n]) => `${CARE_WORDS[a] ?? a}${n! > 1 ? ` ${n} times` : ''}`)
  facts.push(care.length ? `Today ${name} was ${care.join(', ')}.` : `Nobody came to see ${name} today.`)
  facts.push(`${name} is a ${d.temperament} Haggling (${d.temperamentNote}), a ${d.stage}, on day ${d.day + 1} of life.`)
  facts.push(`Mood tonight: ${d.mood >= 70 ? 'happy' : d.mood >= 40 ? 'so-so' : 'low'}.`)
  if (d.season) facts.push(`It is ${d.season} time.`)
  if (d.milestone) facts.push(`Big news: ${name} ${d.milestone}.`)
  if (d.daysLeft <= 2) facts.push(`${name} is old and slow now, with only a few days left. Be gentle and warm.`)
  return facts
}

export const DIARY_SYSTEM = [
  'You write one diary entry for a wee Scottish folklore creature called a Haggling, in its own voice (first person).',
  'Warm, funny and gentle, with a few Scots words (wee, dreich, bonnie, crabbit, braw, haar).',
  'Readers are adults, but keep it family-friendly. No swearing, no alcohol, no news, no real people, no violence, no brand names except Irn-Bru.',
  'Use only the facts given. Do not invent places or events.',
  'Write 1 to 3 short sentences, under 280 characters in total. Use the Haggling\'s name once.',
  'Never call the Haggling he or she: use its name, I/me (it is their own diary), or they/them.',
  'If there was a storm, the entry is about the storm and staying cosy in the burrow.',
  'Reply with the diary entry only.',
].join(' ')

export function diaryPrompt(d: DiaryInput): string {
  return `Facts about today:\n- ${diaryFacts(d).join('\n- ')}\n\nWrite ${safeName(d.name)}'s diary entry for tonight.`
}

/** R3.7: a written diary line for when the AI is not used. Always passes checkLine. */
export function fallbackDiary(d: DiaryInput): string {
  const name = safeName(d.name)
  const where = d.place ? ` over ${d.place}` : ''
  const b = d.weather.some((w) => w.bucket === 'storm') ? 'storm' : (d.weather[d.weather.length - 1]?.bucket ?? '')
  const weather: Record<string, string> = {
    storm: `A storm swept${where} today, and ${name} decided the burrow was the best place to be.`,
    rain: `Rain${where} all day. ${name} listened to it on the roof and felt fair chuffed.`,
    haar: `The haar came in${where}. ${name} breathed it in like a homecoming.`,
    fog: `Mist down to the doorstep${where}. ${name} played hide and seek in it.`,
    snow: `Snow${where}! ${name} ate some and then wanted porridge.`,
    frost: `Frost${where} this morning. ${name} drew patterns on the window.`,
    hot: `Far too warm${where} for ${name}, who lay flat on the cool floor.`,
    windy: `Blowing a hoolie${where}. ${name} leaned into the wind like a wee sail.`,
    sunny: `Sunshine${where}. ${name} squinted at it, suspicious.`,
    crisp: `A crisp, bright day${where}. ${name} dreamed of the hills.`,
    grey: `A dreich day${where}. ${name} pulled the blanket up and said nothing.`,
    humid: `Close and muggy${where}. ${name} sighed a lot.`,
  }
  const first = weather[b] ?? `Another day in the life of ${name}.`
  const fed = (d.care.feed ?? 0) + (d.care.treat ?? 0)
  const second = d.milestone
    ? `Big news: ${name} ${d.milestone}!`
    : fed >= 2 ? 'A full belly and a happy heart.' : (d.care.cuddle ?? 0) > 0 ? 'The cuddles were the best bit.' : 'Hoping for more visits tomorrow.'
  const line = `${first} ${second}`
  return line.length <= 300 ? line : first.slice(0, 300)
}

// ---------------------------------------------------------------- "What's that?" (R4)

const PEOPLE = new Set(['Person', 'Human', 'Adult', 'Male', 'Female', 'Man', 'Woman', 'Boy', 'Girl', 'Teen', 'Child', 'Baby', 'Face', 'Head', 'Selfie', 'Portrait', 'Body Part', 'Hand', 'Finger', 'Skin'])

/** Object labels only: no people, no odd characters, at most 5. */
export function safeLabels(labels: { name: string; confidence: number }[]): string[] {
  return labels
    .filter((l) => l.confidence >= 70 && !PEOPLE.has(l.name))
    .map((l) => l.name.replace(/[^A-Za-z ]+/g, '').trim())
    .filter((n) => n.length > 1 && n.length <= 30)
    .filter((n, i, a) => a.indexOf(n) === i)
    .slice(0, 5)
}

export const REACTION_SYSTEM = [
  'You write one sentence: how a wee Scottish folklore creature called a Haggling reacts to something it is shown in a photo.',
  'Funny and kind, a Scots word or two. Readers are adults, but keep it family-friendly. No swearing, no alcohol, no real people, no brand names.',
  'Use the Haggling\'s name once, and call the Haggling they/them, never he or she. Under 180 characters. Reply with the sentence only.',
].join(' ')

export function reactionPrompt(name: string, temperament: string, labels: string[]): string {
  return `${safeName(name)} is a ${temperament} Haggling. In the photo it sees: ${labels.join(', ')}. How does ${safeName(name)} react?`
}

/** R4.3, R4.4: a written reaction. Always passes checkLine(…, 200). */
export function fallbackReaction(name: string, labels: string[]): string {
  const n = safeName(name)
  if (!labels.length) return `${n} gave you a wee wave.`
  // The first label that is safe to say (no blocked or he/she words), else a plain phrase.
  const ok = (l: string) => !l.toLowerCase().split(/[^a-z']+/).some((w) => BLOCKED.includes(w) || GENDERED.includes(w))
  const thing = (labels.find(ok) ?? 'new thing').toLowerCase()
  return `${n} sniffed the ${thing}, decided it was not a treat, and found it very interesting all the same.`
}
