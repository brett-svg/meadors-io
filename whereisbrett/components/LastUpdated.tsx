'use client'

import { useEffect, useState } from 'react'
import { relativeTime } from '@/lib/time'

/**
 * Renders the server-computed string first so hydration matches exactly, then
 * takes over on the client and keeps ticking while the tab is open.
 */
export function LastUpdated({ iso, initial }: { iso: string; initial: string }) {
  const [label, setLabel] = useState(initial)

  useEffect(() => {
    const tick = () => setLabel(relativeTime(iso))
    tick()
    const timer = setInterval(tick, 30_000)
    return () => clearInterval(timer)
  }, [iso])

  return (
    <time dateTime={iso} suppressHydrationWarning>
      {label}
    </time>
  )
}
