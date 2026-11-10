/** URL path segment for a carer's nest: haggisgotchi.com/{slug} */
export function slugifyName(raw: string): string {
  const base = raw
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
  return base || 'carer'
}

export function nestPathForSlug(slug: string): string {
  return `/${slug.replace(/^\/+/, '')}`
}

export function nestUrlForSlug(slug: string, origin = window.location.origin): string {
  return `${origin.replace(/\/$/, '')}${nestPathForSlug(slug)}`
}

/** Pathname `/moira` → `moira`. Root and asset-like paths → null. */
export function readNestSlugFromPath(pathname = window.location.pathname): string | null {
  const parts = pathname.split('/').filter(Boolean)
  if (parts.length !== 1) return null
  const seg = parts[0].toLowerCase()
  if (seg === 'index.html' || seg.includes('.')) return null
  return seg
}

export function openNestInNewTab(slug: string) {
  const url = nestUrlForSlug(slug)
  window.open(url, '_blank', 'noopener,noreferrer')
}
