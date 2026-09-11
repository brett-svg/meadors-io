import type { Stay, ThreatLevel } from './types'

const HOME_LINES = ['Brett is home.']
const AWAY_LINES = ['Brett is traveling.']
const EMPTY_LINES = ['No location yet.']

/**
 * Pick a line deterministically from a seed so the server and the client agree
 * and the copy only changes when the location does.
 */
export function statusHeadline(stay: Stay | null, isHome: boolean): string {
  if (!stay) return EMPTY_LINES[0]

  const lines = isHome ? HOME_LINES : AWAY_LINES
  return lines[hash(`${stay.city}|${stay.countryCode}|${stay.arrivedAt}`) % lines.length]
}

/** Entirely unserious. Scales with how far and how long he has gotten away. */
export function threatLevel(
  stay: Stay | null,
  isHome: boolean,
  daysAway: number,
): ThreatLevel {
  if (!stay) return 'GUARDED'
  if (isHome) return 'LOW'

  const international = stay.countryCode.toUpperCase() !== 'US'
  if (international && daysAway >= 7) return 'CRITICAL'
  if (international) return 'HIGH'
  if (daysAway >= 7) return 'HIGH'
  return 'ELEVATED'
}

/** FNV-1a, purely so the same stay always yields the same line. */
function hash(input: string): number {
  let value = 0x811c9dc5
  for (let i = 0; i < input.length; i += 1) {
    value ^= input.charCodeAt(i)
    value = Math.imul(value, 0x01000193)
  }
  return Math.abs(value)
}
