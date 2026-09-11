import type { ReactNode } from 'react'

/** A quiet shared card shell for secondary content. */
export function Board({
  label,
  right,
  children,
  className = '',
}: {
  label: string
  right?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section
      className={`overflow-hidden rounded-[22px] border border-[color:var(--line)] bg-[color:var(--surface)] shadow-[0_12px_32px_-24px_rgba(15,23,42,0.32)] ${className}`}
    >
      <header className="flex items-center justify-between gap-3 px-5 pt-5 sm:px-6 sm:pt-6">
        <h2 className="text-sm font-medium text-[color:var(--muted)]">
          {label}
        </h2>
        {right ? (
          <div className="text-sm text-[color:var(--muted)]">
            {right}
          </div>
        ) : null}
      </header>
      {children}
    </section>
  )
}

/** Small visual cue that the location is live. */
export function LiveDot() {
  return (
    <span className="inline-flex items-center gap-2 font-medium text-[color:var(--accent)]">
      <span aria-hidden className="h-2 w-2 rounded-full bg-current" />
      Updated
    </span>
  )
}
