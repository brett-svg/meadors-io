import { Board, LiveDot } from '@/components/Board'
import { LastUpdated } from '@/components/LastUpdated'
import { absoluteTime, relativeTime } from '@/lib/time'
import type { PublicStatus } from '@/lib/types'

export function StatusBoard({ status, now }: { status: PublicStatus; now: number }) {
  if (status.private) return <ClassifiedBoard />
  if (!status.current) return <EmptyBoard />

  const { current, isHome, flag } = status
  const where = [current.region, current.country].filter(Boolean).join(', ')

  return (
    <Board label="Current location" right={<LiveDot />} className="hero-card">
      <div className="px-5 pb-7 pt-9 sm:px-8 sm:pb-9 sm:pt-12">
        <div className="flex items-center gap-4 sm:gap-5">
          <span aria-hidden className="text-5xl leading-none sm:text-6xl">
            {flag}
          </span>
          <div className="min-w-0">
            <h3 className="break-words text-4xl font-semibold leading-[1.05] tracking-[-0.045em] text-[color:var(--text)] sm:text-6xl">
              {current.city}
            </h3>
            <p className="mt-2 text-base text-[color:var(--muted)] sm:text-lg">
              {where}
              <span className="sr-only">, country code {current.countryCode}</span>
            </p>
          </div>
        </div>
      </div>

      <footer className="flex items-center justify-between gap-4 border-t border-[color:var(--line)] bg-[color:var(--surface-subtle)] px-5 py-4 sm:px-8">
        <StatusPill isHome={isHome} />
        <span className="text-right text-sm text-[color:var(--muted)]" title={absoluteTime(current.lastSeenAt)}>
          <span className="block text-xs font-medium uppercase tracking-[0.08em]">Updated</span>
          <span className="mt-0.5 block font-medium text-[color:var(--text)]">
            <LastUpdated iso={current.lastSeenAt} initial={relativeTime(current.lastSeenAt, now)} />
          </span>
        </span>
      </footer>
    </Board>
  )
}

function StatusPill({ isHome }: { isHome: boolean }) {
  return (
    <span
      className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1 text-[0.7rem] font-bold tracking-[0.2em] ${
        isHome
          ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
          : 'border-[color:var(--accent)]/20 bg-[color:var(--accent-soft)] text-[color:var(--accent)]'
      }`}
    >
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
      {isHome ? 'Home' : 'Traveling'}
    </span>
  )
}

function ClassifiedBoard() {
  return (
    <Board label="Current location" right="Private" className="hero-card">
      <div className="px-5 pb-9 pt-10 sm:px-8 sm:pb-12 sm:pt-14">
        <h3 className="text-3xl font-semibold tracking-[-0.04em] text-[color:var(--text)] sm:text-5xl">
          Location hidden
        </h3>
        <p className="mt-3 text-base text-[color:var(--muted)]">Check back later.</p>
      </div>
    </Board>
  )
}

function EmptyBoard() {
  return (
    <Board label="Current location" right="No updates" className="hero-card">
      <div className="px-5 pb-9 pt-10 sm:px-8 sm:pb-12 sm:pt-14">
        <h3 className="text-3xl font-semibold tracking-[-0.04em] text-[color:var(--text)] sm:text-5xl">
          No location yet
        </h3>
        <p className="mt-3 text-base text-[color:var(--muted)]">Check back soon.</p>
      </div>
    </Board>
  )
}
