import type { Place } from './types'

/** Where Brett lives when he is, against all odds, contained. */
export const HOME: Place = {
  city: 'Spokane',
  region: 'Washington',
  country: 'United States',
  countryCode: 'US',
}

/** How many distinct locations we keep. Older stays fall off the end. */
export const MAX_HISTORY = 20

export const SITE_NAME = 'Where Is Brett?'
export const SITE_TAGLINE = 'A Carmen Sandiego situation.'
export const SITE_DESCRIPTION =
  'A live, city-level travel status board answering exactly one question: where in the world is Brett right now?'

/** True when the site should hide whereabouts from the public. */
export function isPrivateMode(): boolean {
  const raw = (process.env.PRIVATE_MODE ?? '').trim().toLowerCase()
  return raw === '1' || raw === 'true' || raw === 'yes' || raw === 'on'
}

/**
 * Canonical origin. Never hard-code the domain: prefer the explicit env var,
 * then whatever host the platform reports, then localhost for `next dev`.
 */
export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  if (explicit) return explicit.replace(/\/+$/, '')

  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL
  if (vercel) return `https://${vercel.replace(/\/+$/, '')}`

  return `http://localhost:${process.env.PORT ?? 3000}`
}
