/**
 * City-level location data. This is deliberately the *only* shape of location
 * data the application ever accepts, stores, or serves. There is no field for
 * latitude, longitude, street address, venue, or any other precise position.
 */
export type Place = {
  city: string
  region: string
  country: string
  countryCode: string
}

/** A place plus when Brett arrived there and when we last heard from him. */
export type Stay = Place & {
  /** ISO-8601. Set once, when this stay is first recorded. */
  arrivedAt: string
  /** ISO-8601. Bumped every time an update arrives from the same city. */
  lastSeenAt: string
}

/** The complete persisted document. `stays[0]` is always the current location. */
export type LocationState = {
  version: 1
  stays: Stay[]
}

export type ThreatLevel = 'LOW' | 'GUARDED' | 'ELEVATED' | 'HIGH' | 'CRITICAL'

export type Stats = {
  citiesVisited: number
  countriesVisited: number
  /** Whole days since Brett last left home, or 0 when he is home. */
  streakDaysAway: number
  threatLevel: ThreatLevel
}

/** The public payload rendered by the homepage and served by `GET /api/location`. */
export type PublicStatus = {
  private: boolean
  isHome: boolean
  hasData: boolean
  current: Stay | null
  flag: string
  headline: string
  history: Stay[]
  stats: Stats | null
}
