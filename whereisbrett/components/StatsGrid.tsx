import type { Stats, ThreatLevel } from '@/lib/types'

const THREAT_STYLES: Record<ThreatLevel, string> = {
  LOW: 'text-emerald-600 dark:text-emerald-400',
  GUARDED: 'text-sky-600 dark:text-sky-400',
  ELEVATED: 'text-amber-600 dark:text-amber-400',
  HIGH: 'text-orange-600 dark:text-orange-400',
  CRITICAL: 'text-red-600 dark:text-red-400',
}

export function StatsGrid({
  stats,
  isHome,
  redacted = false,
}: {
  stats: Stats | null
  isHome: boolean
  redacted?: boolean
}) {
  if (!stats && !redacted) return null

  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Stat label="Cities logged" value={stats ? String(stats.citiesVisited) : null} />
      <Stat label="Countries logged" value={stats ? String(stats.countriesVisited) : null} />
      <Stat
        label="Days from Spokane"
        value={stats ? String(stats.streakDaysAway) : null}
        hint={stats ? streakHint(stats.streakDaysAway, isHome) : undefined}
      />
      <Stat
        label="Threat level"
        value={stats ? stats.threatLevel : null}
        valueClassName={stats ? `${THREAT_STYLES[stats.threatLevel]} text-2xl sm:text-3xl` : ''}
      />
    </dl>
  )
}

/** The number alone is ambiguous on day zero, so say which kind of zero it is. */
function streakHint(days: number, isHome: boolean): string | undefined {
  if (isHome) return 'streak broken (he is home)'
  if (days === 0) return 'he left today'
  return undefined
}

function Stat({
  label,
  value,
  hint,
  valueClassName = '',
}: {
  label: string
  value: string | null
  hint?: string
  valueClassName?: string
}) {
  return (
    <div className="rounded-xl border border-[color:var(--line)] bg-[color:var(--surface)] px-4 py-4">
      <dt className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-[color:var(--muted)]">
        {label}
      </dt>
      <dd
        className={`mt-1.5 font-mono text-3xl font-bold tabular-nums leading-none sm:text-4xl ${valueClassName}`}
      >
        {value ?? <span aria-hidden className="redacted block h-7 w-16" />}
        {value === null ? <span className="sr-only">classified</span> : null}
      </dd>
      {hint ? (
        <p className="mt-2 text-[0.68rem] uppercase tracking-wide text-[color:var(--muted)]">
          {hint}
        </p>
      ) : null}
    </div>
  )
}
