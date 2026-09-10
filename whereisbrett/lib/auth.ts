import { timingSafeEqual } from 'node:crypto'

export type AuthResult = { ok: true } | { ok: false; reason: 'unconfigured' | 'unauthorized' }

/** Long enough that a brute force over the network is hopeless. */
export const MIN_TOKEN_LENGTH = 16

/**
 * Bearer-token check against `LOCATION_UPDATE_TOKEN`.
 *
 * The token lives only in a server-side environment variable: it is never
 * prefixed with NEXT_PUBLIC_, never imported by a client component, and never
 * serialised into a response. A missing or too-short token fails closed rather
 * than allowing an unauthenticated write.
 */
export function authorize(request: Request): AuthResult {
  const expected = process.env.LOCATION_UPDATE_TOKEN
  if (!expected || expected.length < MIN_TOKEN_LENGTH) return { ok: false, reason: 'unconfigured' }

  const match = /^Bearer\s+(.+)$/i.exec((request.headers.get('authorization') ?? '').trim())
  if (!match) return { ok: false, reason: 'unauthorized' }

  return constantTimeEqual(match[1].trim(), expected)
    ? { ok: true }
    : { ok: false, reason: 'unauthorized' }
}

function constantTimeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a, 'utf8')
  const right = Buffer.from(b, 'utf8')
  if (left.length !== right.length) {
    // Burn a comparison anyway so a length mismatch isn't measurably faster.
    timingSafeEqual(left, left)
    return false
  }
  return timingSafeEqual(left, right)
}
