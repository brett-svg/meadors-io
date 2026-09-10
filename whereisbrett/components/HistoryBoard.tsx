import { Board } from '@/components/Board'
import { flagEmoji } from '@/lib/flag'
import { absoluteTime, relativeTime } from '@/lib/time'
import type { Stay } from '@/lib/types'

export function HistoryBoard({
  history,
  now,
  redacted = false,
}: {
  history: Stay[]
  now: number
  redacted?: boolean
}) {
  return (
    <Board label="Previous sightings" right={redacted ? 'Sealed' : `${history.length} on file`}>
      {redacted ? (
        <ul className="divide-y divide-white/10">
          {[0, 1, 2, 3].map((row) => (
            <li key={row} className="flex items-center gap-4 px-4 py-4 sm:px-8">
              <span aria-hidden className="redacted h-4 w-6 text-white/50" />
              <span aria-hidden className="redacted h-4 flex-1 text-white/50" />
              <span aria-hidden className="redacted h-4 w-20 text-white/50" />
            </li>
          ))}
          <li className="sr-only">Location history is classified.</li>
        </ul>
      ) : history.length === 0 ? (
        <p className="px-4 py-8 font-mono text-sm uppercase tracking-[0.16em] text-white/50 sm:px-8">
          No previous sightings yet.
        </p>
      ) : (
        <ol className="divide-y divide-white/10">
          {history.map((stay) => (
            <li
              key={`${stay.city}-${stay.arrivedAt}`}
              className="flex items-start gap-3 px-4 py-3.5 sm:gap-4 sm:px-8"
            >
              <span aria-hidden className="text-lg leading-6">
                {flagEmoji(stay.countryCode)}
              </span>
              {/* City and place stack, so long region names wrap instead of
                  being truncated on a phone. */}
              <div className="min-w-0 flex-1">
                <span className="font-mono text-sm font-semibold uppercase leading-6 tracking-[0.1em] text-[color:var(--board-text)] sm:text-base">
                  {stay.city}
                </span>
                <span className="block font-mono text-[0.68rem] uppercase leading-5 tracking-[0.14em] text-white/45 sm:text-xs">
                  {[stay.region, stay.country].filter(Boolean).join(' · ')}
                </span>
              </div>
              <time
                dateTime={stay.arrivedAt}
                title={absoluteTime(stay.arrivedAt)}
                className="shrink-0 font-mono text-[0.68rem] uppercase leading-6 tracking-[0.14em] text-white/55 sm:text-xs"
              >
                {relativeTime(stay.arrivedAt, now)}
              </time>
            </li>
          ))}
        </ol>
      )}
    </Board>
  )
}
