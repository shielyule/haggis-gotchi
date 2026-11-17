/**
 * share-card R5: link-preview tags for /h/<id>. Pure (tested under node).
 */
export type CardRow = {
  name: string | null
  temperament_id: string | null
  share_enabled: boolean
}

const LABELS: Record<string, string> = {
  douce: 'Douce', skeigh: 'Skeigh', 'ill-trickit': 'Ill-trickit', ree: 'Ree', radge: 'Radge', 'fair-wud': 'Fair Wud',
}

export function esc(v: string): string {
  return v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

export function ogTags(card: CardRow | null, origin: string, id: string): string {
  const site = origin.replace(/\/+$/, '')
  const visible = card?.share_enabled && card.name && card.temperament_id && LABELS[card.temperament_id]
  const title = visible ? `${card!.name} the ${LABELS[card!.temperament_id!]} Haggling` : 'Haggis-gotchi'
  const desc = 'A wee Scottish Haggling that lives on your phone. Get your own Haggis-gotchi egg.'
  const image = visible ? `${site}/og/${card!.temperament_id}.jpg` : `${site}/icons/icon-512.png`
  const url = `${site}/h/${id}`
  return [
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="Haggis-gotchi" />`,
    `<meta property="og:title" content="${esc(title)}" />`,
    `<meta property="og:description" content="${esc(desc)}" />`,
    `<meta property="og:image" content="${esc(image)}" />`,
    `<meta property="og:url" content="${esc(url)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(title)}" />`,
    `<meta name="twitter:image" content="${esc(image)}" />`,
  ].join('\n    ')
}
