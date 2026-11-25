/**
 * Which treat is in the photo? Pure; rules come from REAL Rekognition answers
 * captured 17 Nov 2026 (fixtures/photo/rekognition-2026-11-17.json).
 * Spec: .kiro/specs/photo-care R3, R4 (treat list chosen from the evidence).
 */
export type Detected = {
  labels: { name: string; confidence: number }[]
  words: { text: string; confidence: number }[]
}

export type TreatId = 'irn-bru' | 'bagpipes' | 'kilt' | 'heather' | 'shortbread' | 'tablet'

export type TreatMatch = { id: TreatId; name: string; confidence: number }

export const TREATS: Record<TreatId, { name: string; line: string }> = {
  'irn-bru': { name: 'a can of Irn-Bru', line: '{name} spotted the Irn-Bru and did a wee jig. Made in Scotland from girders!' },
  bagpipes: { name: 'the bagpipes', line: '{name} heard the pipes and marched round the room, chest out.' },
  kilt: { name: 'a kilt', line: '{name} nuzzled the tartan. Pure clan pride.' },
  heather: { name: 'a sprig of heather', line: '{name} sniffed the heather and went all dreamy. Lucky white heather next?' },
  shortbread: { name: 'shortbread', line: '{name} ate the shortbread in one bite. Crumbs everywhere.' },
  tablet: { name: 'a bit of tablet', line: '{name} nibbled the tablet and went pure giddy. Sugar rush!' },
}

/** Photo Treat lines by life stage (docs/LIFE-STAGES.md); baby and child use TREATS[].line. */
const STAGE_TREAT_LINES: Record<string, Partial<Record<TreatId, string>>> = {
  teen: {
    'irn-bru': '{name} necked the Irn-Bru in one and burped the national anthem.',
    bagpipes: '{name} pretended the pipes were embarrassing. Air-piped along when they thought nobody was looking.',
    kilt: '{name} says kilts are cringe. Wore it to the party anyway.',
    heather: '{name} put the heather behind one ear and took forty selfies.',
    shortbread: '{name} ate the whole tin "by accident".',
    tablet: '{name} said tablet is for bairns, then ate three bits and hid the wrapper.',
  },
  adult: {
    'irn-bru': '{name} poured the Irn-Bru into a proper glass. With ice. Classy.',
    bagpipes: '{name} stood up straight for the pipes and got a wee bit misty-eyed.',
    kilt: '{name} admired the pleats and asked who your weaver is.',
    heather: '{name} put the heather in a jam jar on the windowsill. Very Homes and Gardens.',
    shortbread: '{name} had one finger of shortbread with a cup of tea, as is proper.',
    tablet: '{name} cut the tablet into neat wee squares and offered you one. Manners.',
  },
  elder: {
    'irn-bru': '{name} remembers when Irn-Bru came in glass bottles and you got 10p back.',
    bagpipes: '{name} tapped a foot to the pipes and told you about the Gathering of 19-canteen-something.',
    kilt: '{name} says kilts were thicker in their day. And so were winters.',
    heather: '{name} pressed the heather in a book, next to the others.',
    shortbread: '{name} dunked the shortbread. Controversial, but they\u2019ve earned it.',
    tablet: '{name} says tablet was the real treat in their day, made in a big pan on a Sunday.',
  },
}

export function treatLine(id: TreatId, stage: string | undefined, name: string): string {
  return (STAGE_TREAT_LINES[stage ?? '']?.[id] ?? TREATS[id].line).replace(/\{name\}/g, () => name)
}

/** Thresholds from the evidence: Irn-Bru logo text is read at ~80% (girder photo 79.8). */
export const THRESHOLDS = { text: 75, label: 80, exactWord: 60 }

const label = (d: Detected, names: string[], min: number) =>
  Math.max(0, ...d.labels.filter((l) => names.includes(l.name) && l.confidence >= min).map((l) => l.confidence))

function irnBru(d: Detected): number {
  let best = 0
  // The can's sideways logo is often unreadable upright (owner's can, 18 Nov: "BAN URN"),
  // but its upright slogan "ORIGINAL AND BEST" was read at 98-100% in every orientation.
  // Slogan + a drink container = Irn-Bru. No Fanta/Coke/other fixture has this slogan.
  const word = (w: string) =>
    Math.max(0, ...d.words.filter((x) => x.text.toUpperCase().replace(/[^A-Z]/g, '') === w && x.confidence >= 90).map((x) => x.confidence))
  const container = label(d, ['Can', 'Tin', 'Bottle', 'Soda', 'Pop Bottle'], THRESHOLDS.label)
  const slogan = Math.min(word('ORIGINAL'), word('BEST'))
  if (container && slogan) best = Math.max(best, Math.min(slogan, container))
  for (const w of d.words) {
    const t = w.text.toUpperCase().replace(/[^A-Z]/g, '')
    // An exact "IRN" / "BRU" / "IRNBRU" word is strong evidence even when the logo font lowers confidence.
    const exact = /^(IRN|BRU|IRNBRU|IRNIBRU)$/.test(t)
    if (w.confidence < (exact ? THRESHOLDS.exactWord : THRESHOLDS.text)) continue
    if (t === 'IRN') {
      best = Math.max(best, w.confidence)
      continue
    }
    // Seen in real reads: "IRN BRU", "IRNIBRU", "BRU", "BRU'D" (the "Bru'd in Scotland" line).
    if (/^(IRNI?)?BRUD?$/.test(t) || t.includes('IRNBRU') || t.includes('IRNIBRU')) best = Math.max(best, w.confidence)
  }
  return best
}

/**
 * Scottish tablet (owner's photo, 25 Nov, fixtures/photo/rekognition-2026-11-25-tablet.json): the word
 * "Tablet" read at 99.6-99.8% at every angle, and labels Sweets/Candy 85-100%. Both are needed, so an iPad
 * ("Tablet Computer") never counts. Still works with the brand name covered (for filming: trademarks).
 */
function tablet(d: Detected): number {
  const word = Math.max(0, ...d.words.filter((w) => w.text.toUpperCase().replace(/[^A-Z]/g, '') === 'TABLET' && w.confidence >= 90).map((w) => w.confidence))
  const sweets = label(d, ['Sweets', 'Candy', 'Fudge', 'Confectionery'], 85)
  const gadget = label(d, ['Computer', 'Electronics', 'Tablet Computer', 'Phone', 'Mobile Phone', 'Screen', 'Monitor'], 70)
  return word && sweets && !gadget ? Math.min(word, sweets) : 0
}

export function matchTreat(d: Detected): TreatMatch | null {
  const purple = label(d, ['Purple'], 85)
  const flower = label(d, ['Flower', 'Plant'], 90)
  const candidates: [TreatId, number][] = [
    ['irn-bru', irnBru(d)],
    ['bagpipes', label(d, ['Bagpipe'], THRESHOLDS.label)],
    ['kilt', Math.max(label(d, ['Kilt'], 75), label(d, ['Tartan', 'Plaid'], THRESHOLDS.label))],
    ['heather', purple && flower ? Math.min(purple, flower) : 0],
    ['shortbread', label(d, ['Bread', 'Cracker', 'Cookie', 'Biscuit', 'Shortbread'], 90)],
    ['tablet', tablet(d)],
  ]
  const [id, confidence] = candidates.reduce((a, b) => (b[1] > a[1] ? b : a))
  return confidence > 0 ? { id, name: TREATS[id].name, confidence: Math.round(confidence) } : null
}

/** What the Haggling "saw": top labels for the result card (no personal data). */
export function seenSummary(d: Detected, max = 3): string[] {
  const skip = new Set(['Person', 'Human', 'Adult', 'Male', 'Female', 'Man', 'Woman', 'Boy', 'Girl', 'Teen', 'Child', 'Face'])
  return d.labels.filter((l) => !skip.has(l.name)).slice(0, max).map((l) => l.name)
}
