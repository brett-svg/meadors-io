import { HistoryBoard } from '@/components/HistoryBoard'
import { StatsGrid } from '@/components/StatsGrid'
import { StatusBoard } from '@/components/StatusBoard'
import { UtcClock } from '@/components/UtcClock'
import { HOME, SITE_TAGLINE, isPrivateMode } from '@/lib/config'
import { buildPublicStatus } from '@/lib/location'
import { readState } from '@/lib/storage'

// The whole point of the page is that it is current.
export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const now = Date.now()
  const status = buildPublicStatus(await readState(), { private: isPrivateMode(), now })

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
      <DossierBar />

      <header className="mt-8 sm:mt-12">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-balance font-mono text-3xl font-extrabold uppercase leading-[1.05] tracking-tight sm:text-5xl">
              Where in the world is Brett?
            </h1>
            <p className="mt-3 text-base italic text-[color:var(--muted)] sm:text-lg">
              {SITE_TAGLINE}
            </p>
          </div>
          <Stamp status={status} />
        </div>
      </header>

      <div className="mt-8 space-y-4 sm:mt-10 sm:space-y-5">
        <StatusBoard status={status} now={now} />
        <StatsGrid stats={status.stats} isHome={status.isHome} redacted={status.private} />
        <HistoryBoard history={status.history} now={now} redacted={status.private} />
      </div>

      <footer className="mt-10 space-y-2 border-t border-[color:var(--line)] pt-6 font-mono text-[0.7rem] uppercase tracking-[0.14em] text-[color:var(--muted)]">
        <p>
          Known hideout: {HOME.city}, {HOME.region}
        </p>
        <p>
          City-level sightings only. No addresses, no venues — this is a geography game, not a
          stakeout.
        </p>
      </footer>
    </main>
  )
}

function DossierBar() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-lg border border-[color:var(--line)] bg-[color:var(--surface)] px-3 py-2 font-mono text-[0.62rem] uppercase tracking-[0.18em] text-[color:var(--muted)] sm:px-4 sm:text-[0.7rem]">
      <span>Subject: Brett &middot; Case file open</span>
      <UtcClock />
    </div>
  )
}

/** The passport entry stamp: a small, deliberately crooked verdict. */
function Stamp({ status }: { status: ReturnType<typeof buildPublicStatus> }) {
  const label = status.private
    ? 'Sealed'
    : !status.hasData
      ? 'Pending'
      : status.isHome
        ? 'Contained'
        : 'At large'

  return (
    <span
      aria-hidden
      className="stamp hidden shrink-0 -rotate-[8deg] select-none rounded-md border-2 border-dashed px-3 py-1.5 font-mono text-xs font-black uppercase tracking-[0.2em] sm:block"
    >
      {label}
    </span>
  )
}
