/**
 * Pure helpers for the ready email. No Deno or browser APIs, so they run under
 * `node --test` as well as in Edge Functions.
 * Spec: .kiro/specs/security-hardening (R2).
 */

export const RESERVED_SLUGS = new Set([
  'admin',
  'api',
  'phone',
  'privacy',
  'terms',
  'graveyard',
  'static',
  'assets',
  'art',
  'login',
  'auth',
  'www',
  'mother',
])

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** Lowercase a-z 0-9 and hyphens only, max 40 chars. Empty input becomes "carer". */
export function slugifyName(raw: string): string {
  const base = String(raw ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/g, '')
  return base || 'carer'
}

/**
 * Only ever return a slug that is safe to put in a URL path.
 * A candidate that is not already well-formed is ignored, not repaired,
 * so attacker-chosen values never reach the link.
 */
export function safeSlug(candidate: unknown, displayName: unknown): string {
  const c = typeof candidate === 'string' ? candidate.trim() : ''
  if (c.length > 0 && c.length <= 40 && SLUG_RE.test(c) && !RESERVED_SLUGS.has(c)) {
    return c
  }
  const fromName = slugifyName(typeof displayName === 'string' ? displayName : '')
  return RESERVED_SLUGS.has(fromName) ? `${fromName}-1` : fromName
}

/**
 * Plain, short, single-line display name for the subject and greeting.
 * Only letters, numbers, spaces, apostrophes and hyphens survive. Dots, slashes,
 * colons and @ are removed so mail apps cannot auto-link attacker text
 * (escaping alone is not enough: "evil.com" would still be linkified).
 */
export function cleanDisplayName(raw: unknown): string {
  const s = String(raw ?? '')
    .replace(/[^\p{L}\p{N} '-]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 40)
    .trim()
  return s || 'carer'
}

export function isPlausibleEmail(raw: unknown): raw is string {
  if (typeof raw !== 'string') return false
  const s = raw.trim()
  if (s.length < 3 || s.length > 254) return false
  if (/[\s<>"',;]/.test(s)) return false
  return /^[^@]+@[^@]+\.[^@]+$/.test(s)
}

export function buildReadyEmail(input: {
  displayName: unknown
  slug: unknown
  siteUrl: string
}): { subject: string; html: string; nestUrl: string; slug: string } {
  const name = cleanDisplayName(input.displayName)
  const slug = safeSlug(input.slug, input.displayName)
  const nestUrl = `${input.siteUrl.replace(/\/+$/, '')}/${encodeURIComponent(slug)}`
  const n = escapeHtml(name)
  const u = escapeHtml(nestUrl)
  const subject = `Your Haggis-gotchi egg is ready, ${name}`
  const html = `
    <h2 style="font-family: Georgia, serif; color: #3f5a45;">Haggis-gotchi</h2>
    <p style="font-family: system-ui, sans-serif;">
      Hello ${n}, your egg is ready to hatch.
    </p>
    <p style="font-family: system-ui, sans-serif;">
      Open your nest (this is where the Haggling lives, not the mother home):
      <br />
      <a href="${u}"><strong>${u}</strong></a>
    </p>
    <p style="font-family: system-ui, sans-serif;">
      On that page, enter the <strong>6-digit code</strong> we email you when you sign in.
    </p>
    <p style="font-family: system-ui, sans-serif; color: #555; font-size: 14px;">
      If you did not claim an egg at haggisgotchi.com, ignore this email.
    </p>
  `
  return { subject, html, nestUrl, slug }
}

/** play-film R2: "Look what {name} has been up to" (escaped, no personal data in the link). */
export function buildPlayFilmEmail(input: {
  carerName: unknown
  hagglingName: unknown
  siteUrl: string
}): { subject: string; html: string } {
  const carer = escapeHtml(cleanDisplayName(input.carerName))
  const name = cleanDisplayName(input.hagglingName)
  const n = escapeHtml(name)
  const url = escapeHtml(input.siteUrl.replace(/\/+$/, '') + '/')
  return {
    subject: `Look what ${name} has been up to!`,
    html: `
    <h2 style="font-family: Georgia, serif; color: #3f5a45;">Haggis-gotchi</h2>
    <p style="font-family: system-ui, sans-serif;">Hello ${carer},</p>
    <p style="font-family: system-ui, sans-serif;">
      ${n} has been playing. There is a new film waiting for you in <strong>Watch again</strong>.
    </p>
    <p style="font-family: system-ui, sans-serif;"><a href="${url}"><strong>Open Haggis-gotchi</strong></a></p>
    <p style="font-family: system-ui, sans-serif; color: #555; font-size: 14px;">
      Turn on reminders in the app to get these as phone notifications instead.
    </p>
  `,
  }
}
