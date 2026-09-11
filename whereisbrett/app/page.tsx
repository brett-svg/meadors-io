import { HistoryBoard } from '@/components/HistoryBoard'
import { StatusBoard } from '@/components/StatusBoard'
import { isPrivateMode } from '@/lib/config'
import { buildPublicStatus } from '@/lib/location'
import { readState } from '@/lib/storage'

// The whole point of the page is that it is current.
export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const now = Date.now()
  const status = buildPublicStatus(await readState(), { private: isPrivateMode(), now })

  return (
    <main className="mx-auto w-full max-w-2xl px-5 pb-16 pt-10 sm:px-6 sm:pt-16">
      <header>
        <div className="flex items-center gap-2 text-sm font-medium text-[color:var(--muted)]">
          <span aria-hidden className="h-2 w-2 rounded-full bg-[color:var(--accent)]" />
          Live location
        </div>
        <h1 className="mt-3 text-balance text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">
          Where&apos;s Brett?
        </h1>
      </header>

      <div className="mt-8 space-y-5 sm:mt-10">
        <StatusBoard status={status} now={now} />
        <HistoryBoard history={status.history} now={now} redacted={status.private} />
      </div>
    </main>
  )
}
