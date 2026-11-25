/**
 * Daily Scottish folklore riddle (spec ai-haggling R5). Pure: tested under node.
 * The AI writes one riddle a day from the topic list; the written bank is the fallback.
 */
import { BLOCKED } from './aiText.ts'

export type Riddle = { topic: string; question: string; options: string[]; answer: number; explain: string }

export const TOPICS = [
  'the kelpie', 'the selkie', 'the brownie', 'the Loch Ness monster', 'the unicorn of Scotland', 'the thistle',
  'the wild haggis', 'Robert Burns', 'Saint Andrew and the saltire', 'first-footing at Hogmanay', 'the Callanish Stones',
  'the ceilidh', 'the bagpipes', 'the haar', 'Tam o\' Shanter', 'the Blue Men of the Minch', 'the wulver of Shetland',
  'the Fairy Flag of Dunvegan', 'the Stone of Destiny', 'shortbread', 'Up Helly Aa', 'the Cailleach', 'heather', 'the Corryvreckan whirlpool',
]

/**
 * Written by hand (checked facts). Right answer listed first; `arrange` shuffles per day.
 * Owner, 25 Nov: the game uses ONLY these (an AI riddle mixed up two legends). One per topic, so the
 * 24-day cycle never repeats a riddle.
 */
export const RIDDLE_BANK: Riddle[] = [
  { topic: 'the kelpie', question: 'I look like a fine horse by the loch, but climb on my back and I gallop into the water. What am I?', options: ['A kelpie', 'A selkie', 'A brownie'], answer: 0, explain: 'A kelpie is a shape-shifting water horse from Scottish lochs and rivers.' },
  { topic: 'the selkie', question: 'In the sea I am a seal. On land I take off my skin and walk like you. What am I?', options: ['A selkie', 'A kelpie', 'A wulver'], answer: 0, explain: 'Selkies are seal folk who can shed their skins and come ashore as people.' },
  { topic: 'the brownie', question: 'I do your chores while you sleep, but give me new clothes and I leave forever. What am I?', options: ['A brownie', 'A banshee', 'A kelpie'], answer: 0, explain: 'A brownie is a helpful house spirit. Paying it with clothes drives it away.' },
  { topic: 'the unicorn of Scotland', question: 'I have one horn, I am Scotland\'s national animal, and on the royal arms I wear a chain. What am I?', options: ['The unicorn', 'The red deer', 'The golden eagle'], answer: 0, explain: 'The unicorn is Scotland\'s national animal, often shown chained.' },
  { topic: 'the thistle', question: 'Barefoot raiders stepped on me in the dark, cried out, and woke the Scots. What am I?', options: ['The thistle', 'The heather', 'The bluebell'], answer: 0, explain: 'Legend says the thistle saved Scotland, so it became the national flower.' },
  { topic: 'the wild haggis', question: 'My legs are longer on one side, so I can only run one way round the hill. What am I?', options: ['A wild haggis', 'A mountain hare', 'A red squirrel'], answer: 0, explain: 'The wild haggis runs round hills one way only, or so every Scottish child is told.' },
  { topic: 'Robert Burns', question: 'I wrote "Auld Lang Syne" and an address to a pudding. Who am I?', options: ['Robert Burns', 'Walter Scott', 'Robert Louis Stevenson'], answer: 0, explain: 'Robert Burns wrote both. Burns Night on 25 January celebrates him.' },
  { topic: 'Saint Andrew and the saltire', question: 'A white cross on blue, said to have appeared in the sky. What flag am I?', options: ['The saltire', 'The Union flag', 'The lion rampant'], answer: 0, explain: 'The saltire is the cross of Saint Andrew, Scotland\'s patron saint.' },
  { topic: 'first-footing at Hogmanay', question: 'Just after midnight at New Year I am the first through the door, often bringing coal. Who am I?', options: ['The first-footer', 'The piper', 'The postie'], answer: 0, explain: 'First-footing: the first visitor of the year brings luck, and coal for warmth.' },
  { topic: 'the Callanish Stones', question: 'We stand in a ring on the Isle of Lewis, older than the pyramids of Giza. What are we?', options: ['The Callanish Stones', 'The Cairngorms', 'The Old Man of Storr'], answer: 0, explain: 'The Callanish Stones on Lewis are about 5,000 years old.' },
  { topic: 'the ceilidh', question: 'I am a night of music and dancing, where strangers spin you round the room. What am I?', options: ['A ceilidh', 'A clootie', 'A croft'], answer: 0, explain: 'A ceilidh is a Scottish (and Irish) gathering with folk music and dancing.' },
  { topic: 'the bagpipes', question: 'I have a bag, a chanter and drones, and you can hear me across the glen. What am I?', options: ['The bagpipes', 'The fiddle', 'The accordion'], answer: 0, explain: 'The Great Highland bagpipe has a bag, a chanter for the tune and drones.' },
  { topic: 'the haar', question: 'I roll in cold off the North Sea on a warm day and hide the whole town. What am I?', options: ['The haar', 'A blizzard', 'A rainbow'], answer: 0, explain: 'Haar is a cold sea fog on Scotland\'s east coast.' },
  { topic: 'Tam o\' Shanter', question: 'Witches chased me, but they could not cross running water, so my mare lost only her tail. Who am I?', options: ['Tam o\' Shanter', 'Rob Roy', 'Greyfriars Bobby'], answer: 0, explain: 'In Burns\' poem, Tam escapes over the bridge; his horse Meg loses her tail.' },
  { topic: 'the Blue Men of the Minch', question: 'We swim the strait off Lewis and call up storms unless the captain can finish our rhyme. Who are we?', options: ['The Blue Men of the Minch', 'The selkies', 'The kelpies'], answer: 0, explain: 'The Blue Men of the Minch test sailors with rhymes between Lewis and the mainland.' },
  { topic: 'the wulver of Shetland', question: 'Wolf head, kind heart: I leave fish on the windowsills of hungry Shetland families. Who am I?', options: ['The wulver', 'The brownie', 'The trow'], answer: 0, explain: 'The wulver is a gentle wolf-man of Shetland folklore.' },
  { topic: 'the Stone of Destiny', question: 'Kings of Scots were crowned on me at Scone, and today I rest in Edinburgh Castle. What am I?', options: ['The Stone of Destiny', 'The Honours of Scotland', 'Mons Meg'], answer: 0, explain: 'The Stone of Scone, or Stone of Destiny, is kept at Edinburgh Castle.' },
  { topic: 'shortbread', question: 'Butter, sugar and flour: I am crumbly, golden and a favourite at New Year. What am I?', options: ['Shortbread', 'Tablet', 'A bannock'], answer: 0, explain: 'Shortbread is made from butter, sugar and flour.' },
  { topic: 'Up Helly Aa', question: 'In Lerwick each winter, people dressed as Vikings burn a longship. What am I?', options: ['Up Helly Aa', 'Hogmanay', 'Beltane'], answer: 0, explain: 'Up Helly Aa is Shetland\'s fire festival, ending with a burning galley.' },
  { topic: 'the Cailleach', question: 'I am the old woman of winter. I bring the snow and shape the mountains with my hammer. Who am I?', options: ['The Cailleach', 'Saint Bride', 'The Fairy Queen'], answer: 0, explain: 'The Cailleach is the winter hag of Scottish and Irish folklore.' },
  { topic: 'heather', question: 'I turn the hills purple in late summer, and a white sprig of me is lucky. What am I?', options: ['Heather', 'Gorse', 'Bracken'], answer: 0, explain: 'Heather colours the moors purple; white heather is said to bring luck.' },
  { topic: 'the Loch Ness monster', question: 'Folk say I swim in a deep loch near Inverness, and they call me Nessie. What am I?', options: ['The Loch Ness Monster', 'A kelpie', 'The Blue Men of the Minch'], answer: 0, explain: 'Nessie is said to live in Loch Ness, near Inverness. The famous modern sightings began in 1933.' },
  { topic: 'the Fairy Flag of Dunvegan', question: 'I am a faded silk banner in a castle on Skye. Legend says waving me brings the fairies to help the clan. What am I?', options: ['The Fairy Flag', 'The saltire', 'The Stone of Destiny'], answer: 0, explain: 'The Fairy Flag is kept at Dunvegan Castle, home of Clan MacLeod.' },
  { topic: 'the Corryvreckan whirlpool', question: 'I roar between Jura and Scarba, one of the biggest whirlpools in the world. What am I?', options: ['The Corryvreckan', 'Loch Ness', 'The Pentland Firth'], answer: 0, explain: 'The Gulf of Corryvreckan holds one of the world\'s largest whirlpools.' },
]

const DAY = 86_400_000
/** Days since 1970 for a YYYY-MM-DD date. */
export function dayIndex(day: string): number {
  return Math.floor(Date.parse(`${day}T12:00:00Z`) / DAY)
}

/** R5.2: same topic all day, every topic in turn. */
export function topicFor(day: string): string {
  const i = dayIndex(day)
  return TOPICS[((i % TOPICS.length) + TOPICS.length) % TOPICS.length]
}

function seeded(seed: string): () => number {
  let x = 2166136261
  for (const ch of seed) x = Math.imul(x ^ ch.charCodeAt(0), 16777619) >>> 0
  return () => {
    x = Math.imul(x ^ (x >>> 15), 2246822507) >>> 0
    x = Math.imul(x ^ (x >>> 13), 3266489909) >>> 0
    return ((x ^= x >>> 16) >>> 0) / 4294967296
  }
}

/** Shuffle the answers for a day, keeping track of the right one. */
export function arrange(r: Riddle, day: string): Riddle {
  const rand = seeded(`${day}:${r.question}`)
  const order = [0, 1, 2]
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[order[i], order[j]] = [order[j], order[i]]
  }
  return { ...r, options: order.map((i) => r.options[i]), answer: order.indexOf(r.answer) }
}

const hasBlocked = (s: string) => {
  const words = s.toLowerCase().split(/[^a-z']+/)
  return BLOCKED.some((b) => words.includes(b))
}

/** R5.3: every rule a riddle must meet. */
export function isValidRiddle(r: Riddle): boolean {
  if (!r || typeof r.question !== 'string' || typeof r.explain !== 'string' || !Array.isArray(r.options)) return false
  const q = r.question.trim()
  if (q.length < 10 || q.length > 300 || r.explain.trim().length < 5 || r.explain.length > 200) return false
  if (r.options.length !== 3 || r.options.some((o) => typeof o !== 'string' || !o.trim() || o.length > 40)) return false
  if (new Set(r.options.map((o) => o.trim().toLowerCase())).size !== 3) return false
  if (!Number.isInteger(r.answer) || r.answer < 0 || r.answer > 2) return false
  const right = r.options[r.answer].toLowerCase().replace(/^(a|an|the)\s+/, '').trim()
  if (right.length >= 3 && q.toLowerCase().includes(right)) return false
  if ([q, r.explain, ...r.options].some((s) => hasBlocked(s) || /https?:|www\.|[{}<>]/.test(s))) return false
  return true
}

export const RIDDLE_SYSTEM = [
  'You write one short riddle about Scottish folklore or culture for adult players; keep it family-friendly.',
  'It must be factually correct and gentle. No alcohol, violence, swearing or real living people.',
  'Give exactly three answers: one right, two wrong but believable. Do not put the right answer in the question.',
  'Reply with JSON only: {"question": string (under 250 characters), "options": [string, string, string] (each under 35 characters),',
  '"answer": index of the right option (0, 1 or 2), "explain": string (one sentence under 180 characters)}.',
].join(' ')

export function riddlePrompt(day: string): string {
  return `Topic: ${topicFor(day)}. Write the riddle.`
}

/** Parse the model's JSON into a riddle, or null if any rule fails (R5.3). */
export function parseRiddle(raw: string, topic: string): Riddle | null {
  const m = String(raw ?? '').match(/\{[\s\S]*\}/)
  if (!m) return null
  try {
    const j = JSON.parse(m[0]) as Record<string, unknown>
    const r: Riddle = {
      topic,
      question: String(j.question ?? '').trim(),
      options: Array.isArray(j.options) ? j.options.map((o) => String(o).trim()) : [],
      answer: typeof j.answer === 'number' ? j.answer : Number.NaN,
      explain: String(j.explain ?? '').trim(),
    }
    return isValidRiddle(r) ? r : null
  } catch {
    return null
  }
}

/** R5.4: the bank riddle for a day (prefers the day's topic), answers shuffled. */
export function riddleFor(day: string): Riddle {
  const topic = topicFor(day)
  const pick = RIDDLE_BANK.find((r) => r.topic === topic) ?? RIDDLE_BANK[((dayIndex(day) % RIDDLE_BANK.length) + RIDDLE_BANK.length) % RIDDLE_BANK.length]
  return arrange(pick, day)
}
