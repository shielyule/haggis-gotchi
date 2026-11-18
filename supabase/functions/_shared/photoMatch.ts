/**
 * Which treat is in the photo? Pure; rules come from REAL Rekognition answers
 * captured 17 Nov 2026 (fixtures/photo/rekognition-2026-11-17.json).
 * Spec: .kiro/specs/photo-care R3, R4 (treat list chosen from the evidence).
 */
export type Detected = {
  labels: { name: string; confidence: number }[]
  words: { text: string; confidence: number }[]
}

export type TreatId = 'irn-bru' | 'bagpipes' | 'kilt' | 'heather' | 'shortbread'

export type TreatMatch = { id: TreatId; name: string; confidence: number }

export const TREATS: Record<TreatId, { name: string; line: string }> = {
  'irn-bru': { name: 'a can of Irn-Bru', line: '{name} spotted the Irn-Bru and did a wee jig. Made in Scotland from girders!' },
  bagpipes: { name: 'the bagpipes', line: '{name} heard the pipes and marched round the room, chest out.' },
  kilt: { name: 'a kilt', line: '{name} nuzzled the tartan. Pure clan pride.' },
  heather: { name: 'a sprig of heather', line: '{name} sniffed the heather and went all dreamy. Lucky white heather next?' },
  shortbread: { name: 'shortbread', line: '{name} ate the shortbread in one bite. Crumbs everywhere.' },
}

/** Thresholds from the evidence: Irn-Bru logo text is read at ~80% (girder photo 79.8). */
export const THRESHOLDS = { text: 75, label: 80, exactWord: 60 }

const label = (d: Detected, names: string[], min: number) =>
  Math.max(0, ...d.labels.filter((l) => names.includes(l.name) && l.confidence >= min).map((l) => l.confidence))

function irnBru(d: Detected): number {
  let best = 0
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

export function matchTreat(d: Detected): TreatMatch | null {
  const purple = label(d, ['Purple'], 85)
  const flower = label(d, ['Flower', 'Plant'], 90)
  const candidates: [TreatId, number][] = [
    ['irn-bru', irnBru(d)],
    ['bagpipes', label(d, ['Bagpipe'], THRESHOLDS.label)],
    ['kilt', Math.max(label(d, ['Kilt'], 75), label(d, ['Tartan', 'Plaid'], THRESHOLDS.label))],
    ['heather', purple && flower ? Math.min(purple, flower) : 0],
    ['shortbread', label(d, ['Bread', 'Cracker', 'Cookie', 'Biscuit', 'Shortbread'], 90)],
  ]
  const [id, confidence] = candidates.reduce((a, b) => (b[1] > a[1] ? b : a))
  return confidence > 0 ? { id, name: TREATS[id].name, confidence: Math.round(confidence) } : null
}

/** What the Haggling "saw": top labels for the result card (no personal data). */
export function seenSummary(d: Detected, max = 3): string[] {
  const skip = new Set(['Person', 'Human', 'Adult', 'Male', 'Female', 'Man', 'Woman', 'Boy', 'Girl', 'Teen', 'Child', 'Face'])
  return d.labels.filter((l) => !skip.has(l.name)).slice(0, max).map((l) => l.name)
}
