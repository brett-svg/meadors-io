import { Board, LiveDot } from '@/components/Board'
import { LastUpdated } from '@/components/LastUpdated'
import { absoluteTime, relativeTime } from '@/lib/time'
import type { PublicStatus } from '@/lib/types'

export function StatusBoard({ status, now }: { status: PublicStatus; now: number }) {
  if (status.private) return <ClassifiedBoard />
  if (!status.current) return <EmptyBoard />

  const { current, isHome, flag } = status
  const where = [current.region, current.country].filter(Boolean).join(' · ')

  return (
    <Board label="Current position" right={<LiveDot />}>
      <div className="px-4 py-7 sm:px-8 sm:py-10">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          <span aria-hidden className="text-5xl leading-none sm:text-7xl">
            {flag}
          </span>
          <div className="min-w-0">
            <h3 className="animate-flip break-words font-mono text-4xl font-bold uppercase leading-[1.05] tracking-tight text-[color:var(--board-text)] sm:text-6xl">
              {current.city}
            </h3>
            <p className="mt-2 font-mono text-sm uppercase tracking-[0.18em] text-white/60 sm:text-base">
              {where}
              <span className="sr-only">, country code {current.countryCode}</span>
            </p>
          </div>
        </div>

        <p className="mt-7 max-w-2xl text-lg font-medium text-white/90 sm:text-2xl">
          {status.headline}
        </p>
      </div>

      <footer className="flex flex-col gap-3 border-t border-white/10 bg-black/25 px-4 py-3.5 font-mono text-xs uppercase tracking-[0.16em] text-white/60 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <StatusPill isHome={isHome} />
        <span title={absoluteTime(current.lastSeenAt)}>
          Last updated{' '}
          <LastUpdated iso={current.lastSeenAt} initial={relativeTime(current.lastSeenAt, now)} />
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
          ? 'border-emerald-400/50 bg-emerald-400/10 text-emerald-300'
          : 'border-amber-400/50 bg-amber-400/10 text-amber-300'
      }`}
    >
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
      {isHome ? 'AT HOME' : 'TRAVELING'}
    </span>
  )
}

function ClassifiedBoard() {
  return (
    <Board label="Current position" right="Restricted">
      <div className="px-4 py-10 sm:px-8 sm:py-14">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-4">
          <span aria-hidden className="text-5xl leading-none sm:text-7xl">
            🕵️
          </span>
          <div className="space-y-3" aria-hidden>
            <div className="redacted h-9 w-52 text-[color:var(--board-text)] sm:h-12 sm:w-80" />
            <div className="redacted h-4 w-36 text-white/70 sm:w-56" />
          </div>
        </div>
        <p className="mt-8 max-w-2xl text-lg font-medium text-white/90 sm:text-2xl">
          Brett&apos;s current whereabouts are classified.
        </p>
      </div>
      <footer className="border-t border-white/10 bg-black/25 px-4 py-3.5 font-mono text-xs uppercase tracking-[0.16em] text-white/50 sm:px-8">
        Need-to-know only. You do not need to know.
      </footer>
    </Board>
  )
}

function EmptyBoard() {
  return (
    <Board label="Current position" right="No signal">
      <div className="px-4 py-10 sm:px-8 sm:py-14">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          <span aria-hidden className="text-5xl leading-none sm:text-7xl">
            🌍
          </span>
          <div>
            <h3 className="font-mono text-3xl font-bold uppercase tracking-tight text-[color:var(--board-text)] sm:text-5xl">
              Unknown
            </h3>
            <p className="mt-2 font-mono text-sm uppercase tracking-[0.18em] text-white/60">
              Awaiting first transmission
            </p>
          </div>
        </div>
        <p className="mt-7 max-w-2xl text-lg font-medium text-white/90 sm:text-2xl">
          No sightings on record. The investigation begins.
        </p>
      </div>
      <footer className="border-t border-white/10 bg-black/25 px-4 py-3.5 font-mono text-xs uppercase tracking-[0.16em] text-white/50 sm:px-8">
        Every case starts with no leads.
      </footer>
    </Board>
  )
}
