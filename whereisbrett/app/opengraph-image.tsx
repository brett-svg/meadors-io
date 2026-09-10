import { ImageResponse } from 'next/og'
import { SITE_TAGLINE, isPrivateMode } from '@/lib/config'
import { buildPublicStatus } from '@/lib/location'
import { readState } from '@/lib/storage'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const alt = 'Where in the world is Brett?'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const BOARD = '#0b0f16'
const AMBER = '#ffc44d'

/**
 * The Slack/social preview. It shows the current city, so a link pasted into a
 * channel answers the question without anyone clicking it.
 */
export default async function OpengraphImage() {
  const status = buildPublicStatus(await readState(), { private: isPrivateMode() })

  const city = status.private ? 'CLASSIFIED' : (status.current?.city.toUpperCase() ?? 'UNKNOWN')
  const detail = status.private
    ? 'Public disclosure suspended'
    : status.current
      ? [status.current.region, status.current.country].filter(Boolean).join(' · ')
      : 'Awaiting first transmission'
  const badge = status.private
    ? 'SEALED'
    : !status.hasData
      ? 'PENDING'
      : status.isHome
        ? 'AT HOME'
        : 'TRAVELING'
  // Satori ships no emoji font, so the flag emoji used on the page would render
  // as nothing here. A country-code plate is the passport-stamp equivalent and
  // needs only the built-in font.
  const plate = status.private ? 'XX' : (status.current?.countryCode ?? '??')
  const cityFontSize = city.length > 16 ? 68 : city.length > 12 ? 92 : 124

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: BOARD,
          backgroundImage:
            'repeating-linear-gradient(to bottom, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 2px, rgba(0,0,0,0) 2px, rgba(0,0,0,0) 40px)',
          padding: '64px 72px',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div
            style={{
              fontSize: 28,
              letterSpacing: 8,
              color: 'rgba(255,255,255,0.55)',
              textTransform: 'uppercase',
            }}
          >
            Where in the world is Brett?
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: 24,
              letterSpacing: 6,
              color: AMBER,
              border: `2px solid ${AMBER}`,
              borderRadius: 999,
              padding: '8px 22px',
            }}
          >
            {badge}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 36 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 156,
              height: 156,
              flexShrink: 0,
              borderRadius: 28,
              border: `5px solid ${AMBER}`,
              color: AMBER,
              fontSize: 68,
              letterSpacing: 6,
            }}
          >
            {plate}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: cityFontSize, color: AMBER, lineHeight: 1.05 }}>
              {city}
            </div>
            <div
              style={{
                fontSize: 32,
                letterSpacing: 5,
                color: 'rgba(255,255,255,0.6)',
                textTransform: 'uppercase',
                marginTop: 14,
              }}
            >
              {detail}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', fontSize: 30, color: 'rgba(255,255,255,0.85)' }}>
          {status.private ? SITE_TAGLINE : status.headline}
        </div>
      </div>
    ),
    size,
  )
}
