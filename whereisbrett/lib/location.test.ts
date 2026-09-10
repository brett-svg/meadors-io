import assert from 'node:assert/strict'
import { test } from 'node:test'
import { MAX_HISTORY } from './config'
import { flagEmoji } from './flag'
import { applyUpdate, buildPublicStatus, computeStats, isHome, streakDaysAway } from './location'
import { EMPTY_STATE } from './storage'
import { relativeTime } from './time'
import type { LocationState, Place } from './types'
import { parseLocationUpdate } from './validate'

const spokane: Place = {
  city: 'Spokane',
  region: 'Washington',
  country: 'United States',
  countryCode: 'US',
}
const budapest: Place = { city: 'Budapest', region: '', country: 'Hungary', countryCode: 'HU' }
const seattle: Place = {
  city: 'Seattle',
  region: 'Washington',
  country: 'United States',
  countryCode: 'US',
}

const at = (iso: string) => new Date(iso)

test('home detection is case- and accent-insensitive but city-specific', () => {
  assert.equal(isHome(spokane), true)
  assert.equal(isHome({ ...spokane, city: 'SPOKANE', region: 'WA' }), true)
  assert.equal(isHome(seattle), false)
  assert.equal(isHome(budapest), false)
  assert.equal(isHome(null), false)
})

test('a first update becomes the current location', () => {
  const { state, duplicate, current } = applyUpdate(EMPTY_STATE, budapest, at('2026-09-01T10:00:00Z'))
  assert.equal(duplicate, false)
  assert.equal(state.stays.length, 1)
  assert.equal(current.city, 'Budapest')
  assert.equal(current.arrivedAt, '2026-09-01T10:00:00.000Z')
  assert.equal(current.lastSeenAt, '2026-09-01T10:00:00.000Z')
})

test('a repeat from the same city refreshes the timestamp instead of adding history', () => {
  const first = applyUpdate(EMPTY_STATE, budapest, at('2026-09-01T10:00:00Z')).state
  const second = applyUpdate(first, budapest, at('2026-09-01T18:30:00Z'))

  assert.equal(second.duplicate, true)
  assert.equal(second.state.stays.length, 1, 'no duplicate history entry')
  assert.equal(second.current.arrivedAt, '2026-09-01T10:00:00.000Z', 'arrival is preserved')
  assert.equal(second.current.lastSeenAt, '2026-09-01T18:30:00.000Z', 'sighting is refreshed')
})

test('a repeat keeps the spelling already on display but fills in a missing region', () => {
  const first = applyUpdate(EMPTY_STATE, budapest, at('2026-09-01T10:00:00Z')).state
  const second = applyUpdate(first, {
    city: 'budapest',
    region: 'Central Hungary',
    country: 'Hungary',
    countryCode: 'HU',
  })

  assert.equal(second.current.city, 'Budapest', 'sloppier casing does not overwrite the display')
  assert.equal(second.current.region, 'Central Hungary', 'a previously empty region is filled in')
})

test('duplicate detection ignores case, spacing, and accents', () => {
  const first = applyUpdate(EMPTY_STATE, { ...budapest, city: 'Zürich', country: 'Switzerland', countryCode: 'CH' }).state
  const second = applyUpdate(first, {
    city: ' zurich ',
    region: 'Zürich',
    country: 'Switzerland',
    countryCode: 'CH',
  })
  assert.equal(second.duplicate, true)
  assert.equal(second.state.stays.length, 1)
})

test('same city name in a different country is a real move', () => {
  const first = applyUpdate(EMPTY_STATE, {
    city: 'Vancouver',
    region: 'British Columbia',
    country: 'Canada',
    countryCode: 'CA',
  }).state
  const second = applyUpdate(first, {
    city: 'Vancouver',
    region: 'Washington',
    country: 'United States',
    countryCode: 'US',
  })
  assert.equal(second.duplicate, false)
  assert.equal(second.state.stays.length, 2)
})

test('history keeps only the most recent MAX_HISTORY locations', () => {
  let state: LocationState = EMPTY_STATE
  for (let i = 0; i < MAX_HISTORY + 7; i += 1) {
    state = applyUpdate(state, { ...budapest, city: `City ${i}` }).state
  }
  assert.equal(state.stays.length, MAX_HISTORY)
  assert.equal(state.stays[0].city, `City ${MAX_HISTORY + 6}`, 'newest first')
})

test('streak counts days since Brett last left Spokane', () => {
  const now = Date.parse('2026-09-10T00:00:00Z')
  let state = applyUpdate(EMPTY_STATE, spokane, at('2026-08-01T00:00:00Z')).state
  state = applyUpdate(state, seattle, at('2026-09-04T00:00:00Z')).state
  state = applyUpdate(state, budapest, at('2026-09-08T00:00:00Z')).state

  assert.equal(streakDaysAway(state, now), 6, 'measured from the departure, not the latest hop')

  const backHome = applyUpdate(state, spokane, at('2026-09-09T00:00:00Z')).state
  assert.equal(streakDaysAway(backHome, now), 0)
})

test('stats count distinct cities and countries and scale the threat level', () => {
  const now = Date.parse('2026-09-10T00:00:00Z')
  let state = applyUpdate(EMPTY_STATE, spokane, at('2026-08-01T00:00:00Z')).state
  state = applyUpdate(state, seattle, at('2026-09-09T00:00:00Z')).state

  let stats = computeStats(state, now)
  assert.equal(stats.citiesVisited, 2)
  assert.equal(stats.countriesVisited, 1)
  assert.equal(stats.threatLevel, 'ELEVATED', 'domestic and recent')

  state = applyUpdate(state, budapest, at('2026-09-09T12:00:00Z')).state
  stats = computeStats(state, now)
  assert.equal(stats.countriesVisited, 2)
  assert.equal(stats.threatLevel, 'HIGH', 'international')

  const home = applyUpdate(state, spokane, at('2026-09-09T23:00:00Z')).state
  assert.equal(computeStats(home, now).threatLevel, 'LOW')
})

test('the public payload never contains anything but city-level fields', () => {
  const state = applyUpdate(EMPTY_STATE, budapest, at('2026-09-08T00:00:00Z')).state
  const status = buildPublicStatus(state, { private: false })

  assert.deepEqual(Object.keys(status.current ?? {}).sort(), [
    'arrivedAt',
    'city',
    'country',
    'countryCode',
    'lastSeenAt',
    'region',
  ])
  const serialised = JSON.stringify(status).toLowerCase()
  for (const forbidden of ['latitude', 'longitude', 'lat"', 'lon', 'address', 'street']) {
    assert.equal(serialised.includes(forbidden), false, `leaked ${forbidden}`)
  }
})

test('private mode withholds the location, history, and stats', () => {
  let state = applyUpdate(EMPTY_STATE, spokane, at('2026-09-01T00:00:00Z')).state
  state = applyUpdate(state, budapest, at('2026-09-08T00:00:00Z')).state

  const status = buildPublicStatus(state, { private: true })
  assert.equal(status.current, null)
  assert.deepEqual(status.history, [])
  assert.equal(status.stats, null)
  assert.equal(status.hasData, true, 'the site still knows an update exists')
  assert.equal(status.headline, "Brett's current whereabouts are classified.")
  assert.equal(JSON.stringify(status).includes('Budapest'), false)
})

test('the empty state renders a sensible first-run payload', () => {
  const status = buildPublicStatus(EMPTY_STATE, { private: false })
  assert.equal(status.hasData, false)
  assert.equal(status.current, null)
  assert.equal(status.stats, null)
  assert.equal(status.headline, 'No sightings on record. The investigation begins.')
})

test('status copy is stable for a given stay', () => {
  const state = applyUpdate(EMPTY_STATE, budapest, at('2026-09-08T00:00:00Z')).state
  const first = buildPublicStatus(state, { private: false }).headline
  const second = buildPublicStatus(state, { private: false }).headline
  assert.equal(first, second)
})

test('input validation cleans, uppercases, and rejects junk', () => {
  const ok = parseLocationUpdate({
    city: '  Budapest  ',
    region: '',
    country: 'Hungary',
    countryCode: 'hu',
  })
  assert.equal(ok.ok, true)
  assert.deepEqual(ok.ok && ok.place, {
    city: 'Budapest',
    region: '',
    country: 'Hungary',
    countryCode: 'HU',
  })

  assert.equal(parseLocationUpdate({ city: '', country: 'Hungary', countryCode: 'HU' }).ok, false)
  assert.equal(parseLocationUpdate({ city: 'Budapest', country: '', countryCode: 'HU' }).ok, false)
  assert.equal(parseLocationUpdate({ city: 'Budapest' }).ok, false, 'country is required')
  assert.equal(parseLocationUpdate('nope').ok, false)
})

test('countryCode is optional and derived from the country name', () => {
  const derived = parseLocationUpdate({ city: 'Budapest', country: 'Hungary' })
  assert.equal(derived.ok && derived.place.countryCode, 'HU')

  const aliased = parseLocationUpdate({ city: 'Spokane', region: 'WA', country: 'USA' })
  assert.equal(aliased.ok && aliased.place.countryCode, 'US')

  const supplied = parseLocationUpdate({ city: 'Budapest', country: 'Hungary', countryCode: 'hu' })
  assert.equal(supplied.ok && supplied.place.countryCode, 'HU', 'a supplied code is honoured')

  const junk = parseLocationUpdate({ city: 'Budapest', country: 'Hungary', countryCode: 'HUN' })
  assert.equal(junk.ok && junk.place.countryCode, 'HU', 'an unusable code falls back to the name')

  const unknown = parseLocationUpdate({ city: 'Atlantis', country: 'Atlantis' })
  assert.equal(unknown.ok && unknown.place.countryCode, '', 'never blocks an update')
})

test('an unresolvable country still renders a neutral flag and dedupes by name', () => {
  const first = applyUpdate(EMPTY_STATE, {
    city: 'Atlantis',
    region: '',
    country: 'Atlantis',
    countryCode: '',
  })
  assert.equal(buildPublicStatus(first.state, { private: false }).flag, '🏳️')

  const second = applyUpdate(first.state, {
    city: 'Atlantis',
    region: '',
    country: 'Atlantis',
    countryCode: '',
  })
  assert.equal(second.duplicate, true)
})

test('extra fields such as coordinates are stripped before storage', () => {
  const parsed = parseLocationUpdate({
    city: 'Budapest',
    country: 'Hungary',
    countryCode: 'HU',
    latitude: 47.4979,
    longitude: 19.0402,
    address: '1051 Budapest, Sample utca 1',
  })
  assert.equal(parsed.ok, true)
  assert.deepEqual(Object.keys(parsed.ok ? parsed.place : {}).sort(), [
    'city',
    'country',
    'countryCode',
    'region',
  ])
})

test('region is optional and defaults to empty', () => {
  const parsed = parseLocationUpdate({ city: 'Budapest', country: 'Hungary', countryCode: 'HU' })
  assert.equal(parsed.ok && parsed.place.region, '')
})

test('flag emoji derives from the country code without any asset', () => {
  assert.equal(flagEmoji('HU'), '🇭🇺')
  assert.equal(flagEmoji('us'), '🇺🇸')
  assert.equal(flagEmoji('ZZZ'), '🏳️')
})

test('relative time reads like a human wrote it', () => {
  const now = Date.parse('2026-09-10T12:00:00Z')
  assert.equal(relativeTime('2026-09-10T11:59:30Z', now), 'just now')
  assert.equal(relativeTime('2026-09-10T11:00:00Z', now), '1 hour ago')
  assert.equal(relativeTime('2026-09-08T12:00:00Z', now), '2 days ago')
  assert.equal(relativeTime('not-a-date', now), 'unknown')
})
