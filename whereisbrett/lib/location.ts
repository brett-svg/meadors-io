import { HOME, MAX_HISTORY } from './config'
import { flagEmoji } from './flag'
import { statusHeadline, threatLevel } from './status'
import { daysBetween } from './time'
import type { LocationState, Place, PublicStatus, Stats, Stay } from './types'

/** Case- and accent-insensitive key so "Zürich" and "Zurich" are one city. */
function fold(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

function cityKey(place: Place): string {
  return `${fold(place.city)}|${fold(place.countryCode) || fold(place.country)}`
}

export function isHome(place: Place | null): boolean {
  return place !== null && cityKey(place) === cityKey(HOME)
}

/**
 * Fold an incoming update into the stored state.
 *
 * An update from the city Brett is already in is a *sighting*, not a move: it
 * refreshes the timestamp on the current stay instead of adding a history
 * entry. Anything else pushes a new stay onto the front and trims the tail.
 */
export function applyUpdate(
  state: LocationState,
  place: Place,
  now: Date = new Date(),
): { state: LocationState; duplicate: boolean; current: Stay } {
  const timestamp = now.toISOString()
  const [currentStay, ...rest] = state.stays

  if (currentStay && cityKey(currentStay) === cityKey(place)) {
    // Same city: this is a sighting, not a move. Keep the arrival time and the
    // spelling we already showed, but let a later ping fill in a region the
    // first one was missing.
    const refreshed: Stay = {
      ...currentStay,
      region: currentStay.region || place.region,
      lastSeenAt: timestamp,
    }
    return {
      state: { version: 1, stays: [refreshed, ...rest] },
      duplicate: true,
      current: refreshed,
    }
  }

  const arrival: Stay = { ...place, arrivedAt: timestamp, lastSeenAt: timestamp }
  const stays = [arrival, ...state.stays].slice(0, MAX_HISTORY)
  return { state: { version: 1, stays }, duplicate: false, current: arrival }
}

/** Whole days since Brett last left Spokane. Zero while he is home. */
export function streakDaysAway(state: LocationState, now: number = Date.now()): number {
  const [currentStay] = state.stays
  if (!currentStay || isHome(currentStay)) return 0

  let departure = currentStay
  for (const stay of state.stays) {
    if (isHome(stay)) break
    departure = stay
  }
  return daysBetween(departure.arrivedAt, now)
}

export function computeStats(state: LocationState, now: number = Date.now()): Stats {
  const [currentStay] = state.stays
  const home = isHome(currentStay ?? null)
  const days = streakDaysAway(state, now)

  return {
    citiesVisited: new Set(state.stays.map(cityKey)).size,
    countriesVisited: new Set(
      state.stays.map((stay) => fold(stay.countryCode) || fold(stay.country)),
    ).size,
    streakDaysAway: days,
    threatLevel: threatLevel(currentStay ?? null, home, days),
  }
}

/**
 * Everything the public surface is allowed to know. When PRIVATE_MODE is on we
 * still hold the data — we just stop handing out any of it, including history
 * and the country/city names inside the stats.
 */
export function buildPublicStatus(
  state: LocationState,
  options: { private: boolean; now?: number } = { private: false },
): PublicStatus {
  const now = options.now ?? Date.now()
  const [currentStay] = state.stays
  const current = currentStay ?? null
  const home = isHome(current)
  const hasData = current !== null

  if (options.private) {
    return {
      private: true,
      isHome: false,
      hasData,
      current: null,
      flag: '🕵️',
      headline: "Brett's current whereabouts are classified.",
      history: [],
      stats: null,
    }
  }

  return {
    private: false,
    isHome: home,
    hasData,
    current,
    flag: current ? flagEmoji(current.countryCode) : '🌍',
    headline: statusHeadline(current, home),
    history: state.stays.slice(1),
    stats: hasData ? computeStats(state, now) : null,
  }
}
