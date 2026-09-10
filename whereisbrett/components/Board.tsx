import type { ReactNode } from 'react'

/** The shared split-flap panel used for the status card and the history list. */
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
      className={`board overflow-hidden rounded-2xl border border-black/40 shadow-[0_18px_50px_-24px_rgba(0,0,0,0.75)] ${className}`}
    >
      <header className="flex items-center justify-between gap-3 border-b border-white/10 bg-white/[0.04] px-4 py-2.5 sm:px-6">
        <h2 className="font-mono text-[0.68rem] uppercase tracking-[0.22em] text-white/60 sm:text-xs">
          {label}
        </h2>
        {right ? (
          <div className="font-mono text-[0.68rem] uppercase tracking-[0.18em] text-white/50 sm:text-xs">
            {right}
          </div>
        ) : null}
      </header>
      {children}
    </section>
  )
}

/** Amber "live" indicator. Purely decorative. */
export function LiveDot() {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span aria-hidden className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-current" />
      LIVE
    </span>
  )
}
