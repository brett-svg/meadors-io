import type { Stay, ThreatLevel } from './types'

const HOME_LINES = [
  'Against all odds, Brett is home.',
  'Brett has been successfully contained.',
  'Carmen Sandiego threat level: LOW.',
  'The trail has gone cold. He is in Spokane.',
  'All agents stand down. Target is on the couch.',
]

const AWAY_LINES = [
  'Brett has escaped again.',
  'The search continues.',
  'Yes, he is traveling again.',
  'Last seen boarding something. Again.',
  'Sightings confirmed. Containment failed.',
]

const EMPTY_LINES = ['No sightings on record. The investigation begins.']

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
