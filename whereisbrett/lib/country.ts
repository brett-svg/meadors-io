/**
 * Country name -> ISO 3166-1 alpha-2, built from the ICU data that ships with
 * Node. No dependency, no data file to keep current.
 *
 * This exists so the iPhone Shortcut can stay short: `Get Details of Location`
 * reliably gives City, State, and Country, and the server turns the country
 * name into the code the flag is drawn from. A Shortcut that *can* supply a
 * code is still preferred — see `resolveCountryCode`.
 */

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

function fold(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
}

/** Everyday names the geocoder may use that ICU spells differently. */
const ALIASES: Record<string, string> = {
  unitedstatesofamerica: 'US',
  usa: 'US',
  us: 'US',
  america: 'US',
  uk: 'GB',
  greatbritain: 'GB',
  england: 'GB',
  scotland: 'GB',
  wales: 'GB',
  northernireland: 'GB',
  czechrepublic: 'CZ',
  turkey: 'TR',
  holland: 'NL',
  thenetherlands: 'NL',
  southkorea: 'KR',
  northkorea: 'KP',
  russianfederation: 'RU',
  ivorycoast: 'CI',
  capeverde: 'CV',
  burma: 'MM',
  vaticancity: 'VA',
  uae: 'AE',
  swaziland: 'SZ',
  macedonia: 'MK',
}

let cache: Map<string, string> | null = null

function nameIndex(): Map<string, string> {
  if (cache) return cache

  const index = new Map<string, string>()
  const display = new Intl.DisplayNames(['en'], { type: 'region' })

  for (const first of ALPHABET) {
    for (const second of ALPHABET) {
      const code = `${first}${second}`
      let name: string | undefined
      try {
        name = display.of(code)
      } catch {
        continue
      }
      // ICU echoes the input back for codes it doesn't know.
      if (!name || name === code) continue
      index.set(fold(name), code)
    }
  }

  for (const [alias, code] of Object.entries(ALIASES)) index.set(alias, code)

  cache = index
  return index
}

/**
 * Prefer a code the client actually sent; otherwise look the country name up.
 * Returns '' when neither works, which renders as a neutral flag rather than
 * rejecting an otherwise valid update.
 */
export function resolveCountryCode(country: string, provided?: string): string {
  const explicit = (provided ?? '').trim().toUpperCase()
  if (/^[A-Z]{2}$/.test(explicit)) return explicit

  return nameIndex().get(fold(country)) ?? ''
}
