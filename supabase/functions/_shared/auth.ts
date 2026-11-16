/**
 * Shared-secret check for scheduled (cron) Edge Functions.
 * Spec: .kiro/specs/security-hardening (R3).
 */

/** Constant-time string compare so response time does not leak how much matched. */
export function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder()
  const x = enc.encode(a)
  const y = enc.encode(b)
  let diff = x.length ^ y.length
  const len = Math.max(x.length, y.length)
  for (let i = 0; i < len; i++) {
    diff |= (x[i] ?? 0) ^ (y[i] ?? 0)
  }
  return diff === 0
}

/**
 * True only when a non-empty secret is configured AND the request carries the
 * same value in the `x-cron-secret` header. Fails closed.
 */
export function isAuthorizedCron(
  headerValue: string | null | undefined,
  secret: string | null | undefined,
): boolean {
  if (!secret || secret.length < 24) return false
  if (!headerValue) return false
  return timingSafeEqual(headerValue, secret)
}
