import { z } from 'zod'
import { resolveCountryCode } from './country'
import type { Place } from './types'

// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u001F\u007F-\u009F]/g

/**
 * Strip control characters, collapse whitespace, and cap length. Everything the
 * Shortcut sends is free text from a geocoder, so it gets scrubbed before it is
 * ever stored or rendered.
 */
const clean = (max: number) =>
  z
    .string()
    .max(200)
    .transform((value) => value.replace(CONTROL_CHARS, ' ').replace(/\s+/g, ' ').trim())
    .pipe(z.string().max(max))

/**
 * The Shortcut's payload. Only these four fields are accepted; anything else is
 * dropped, so a Shortcut that accidentally includes coordinates cannot get them
 * into storage.
 */
export const locationUpdateSchema = z
  .object({
    city: clean(80).pipe(z.string().min(1, 'city is required')),
    region: clean(80).optional().default(''),
    country: clean(80).pipe(z.string().min(1, 'country is required')),
    // Optional on purpose: the Shortcut only has to send the country *name*,
    // which keeps it to four actions. A supplied code always wins.
    countryCode: clean(8)
      .transform((value) => value.toUpperCase())
      .optional()
      .default(''),
  })
  .strip()

export type LocationUpdate = z.infer<typeof locationUpdateSchema>

export function parseLocationUpdate(
  input: unknown,
): { ok: true; place: Place } | { ok: false; errors: string[] } {
  const result = locationUpdateSchema.safeParse(input)
  if (!result.success) {
    return {
      ok: false,
      errors: result.error.issues.map((issue) =>
        issue.path.length ? `${issue.path.join('.')}: ${issue.message}` : issue.message,
      ),
    }
  }
  const { city, region, country, countryCode } = result.data
  return {
    ok: true,
    place: { city, region, country, countryCode: resolveCountryCode(country, countryCode) },
  }
}
