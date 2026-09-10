const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/** "3 hours ago" — stable between server and client for the same two instants. */
export function relativeTime(iso: string, now: number = Date.now()): string {
  const then = Date.parse(iso)
  if (Number.isNaN(then)) return 'unknown'

  const elapsed = now - then
  if (elapsed < 0) return 'just now'
  if (elapsed < MINUTE) return 'just now'
  if (elapsed < HOUR) return plural(Math.floor(elapsed / MINUTE), 'minute')
  if (elapsed < DAY) return plural(Math.floor(elapsed / HOUR), 'hour')
  if (elapsed < 30 * DAY) return plural(Math.floor(elapsed / DAY), 'day')

  const months = Math.floor(elapsed / (30 * DAY))
  if (months < 12) return plural(months, 'month')
  return plural(Math.floor(months / 12), 'year')
}

/** Whole days between two instants, floored, never negative. */
export function daysBetween(iso: string, now: number = Date.now()): number {
  const then = Date.parse(iso)
  if (Number.isNaN(then)) return 0
  return Math.max(0, Math.floor((now - then) / DAY))
}

/** "10 Sep 2026, 14:32 UTC" — one unambiguous absolute rendering, no locale drift. */
export function absoluteTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return 'unknown'

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
    timeZoneName: 'short',
  }).format(date)
}

function plural(value: number, unit: string): string {
  return `${value} ${unit}${value === 1 ? '' : 's'} ago`
}
