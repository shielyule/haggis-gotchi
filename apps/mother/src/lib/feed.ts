/** public-feed R7: one line per event. Pure (tested under node). */
export type FeedEvent = { carer_name: string; haggling_name: string; action: string; at: string }

export function feedSentence(e: FeedEvent): string {
  const c = e.carer_name || 'A carer'
  const h = e.haggling_name || 'their Haggling'
  switch (e.action) {
    case 'feed':
      return `${c} just fed ${h}`
    case 'cuddle':
      return `${c} just cuddled ${h}`
    case 'walk':
      return `${c} just took ${h} for a walk`
    case 'treat':
      return `${c} just gave ${h} a treat`
    case 'clean':
      return `${c} just cleaned up after ${h}`
    case 'photo_treat':
      return `${c} just shared a Photo Treat with ${h}`
    default:
      return `${c} just spent time with ${h}`
  }
}

export function timeAgo(iso: string, nowMs: number): string {
  const s = Math.max(0, Math.round((nowMs - Date.parse(iso)) / 1000))
  if (!Number.isFinite(s)) return ''
  if (s < 60) return 'just now'
  const m = Math.round(s / 60)
  if (m < 60) return `${m} min ago`
  const h = Math.round(m / 60)
  return h === 1 ? '1 hour ago' : `${h} hours ago`
}
