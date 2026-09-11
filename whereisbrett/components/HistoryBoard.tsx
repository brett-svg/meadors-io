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
  if (redacted || history.length === 0) return null

  return (
    <Board label="Recent places">
      <ol className="mt-4 divide-y divide-[color:var(--line)]">
          {history.map((stay) => (
            <li
              key={`${stay.city}-${stay.arrivedAt}`}
              className="flex items-start gap-3 px-5 py-4 sm:gap-4 sm:px-6"
            >
              <span aria-hidden className="text-lg leading-6">
                {flagEmoji(stay.countryCode)}
              </span>
              {/* City and place stack, so long region names wrap instead of
                  being truncated on a phone. */}
              <div className="min-w-0 flex-1">
                <span className="text-base font-medium leading-6 text-[color:var(--text)]">
                  {stay.city}
                </span>
                <span className="block text-sm leading-5 text-[color:var(--muted)]">
                  {[stay.region, stay.country].filter(Boolean).join(', ')}
                </span>
              </div>
              <time
                dateTime={stay.arrivedAt}
                title={absoluteTime(stay.arrivedAt)}
                className="shrink-0 text-sm leading-6 text-[color:var(--muted)]"
              >
                {relativeTime(stay.arrivedAt, now)}
              </time>
            </li>
          ))}
      </ol>
    </Board>
  )
}
