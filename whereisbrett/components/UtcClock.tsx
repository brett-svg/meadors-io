'use client'

import { useEffect, useState } from 'react'

/** A departure board needs a clock. Blank until mounted so SSR never mismatches. */
export function UtcClock() {
  const [time, setTime] = useState<string | null>(null)

  useEffect(() => {
    const tick = () => setTime(new Date().toISOString().slice(11, 19))
    tick()
    const timer = setInterval(tick, 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <span className="tabular-nums" suppressHydrationWarning>
      {time ?? '--:--:--'} UTC
    </span>
  )
}
