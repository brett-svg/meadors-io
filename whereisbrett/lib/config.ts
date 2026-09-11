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
export const SITE_TAGLINE = 'A live location, kept current.'
export const SITE_DESCRIPTION =
  'Brett’s current city, with the latest update time.'

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

  const platform =
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    process.env.VERCEL_URL ||
    process.env.RAILWAY_PUBLIC_DOMAIN
  if (platform) return `https://${platform.replace(/\/+$/, '')}`

  return `http://localhost:${process.env.PORT ?? 3000}`
}
