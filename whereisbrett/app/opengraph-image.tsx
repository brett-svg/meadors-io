import { ImageResponse } from 'next/og'
import { SITE_TAGLINE, isPrivateMode } from '@/lib/config'
import { buildPublicStatus } from '@/lib/location'
import { readState } from '@/lib/storage'
import { relativeTime } from '@/lib/time'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const alt = "Brett's current location"
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const PAGE = '#f5f5f7'
const SURFACE = '#ffffff'
const TEXT = '#1d1d1f'
const MUTED = '#6e6e73'
const BLUE = '#007aff'

/**
 * The Slack/social preview. It shows the current city, so a link pasted into a
 * channel answers the question without anyone clicking it.
 */
export default async function OpengraphImage() {
  const status = buildPublicStatus(await readState(), { private: isPrivateMode() })

  const city = status.private ? 'Location hidden' : (status.current?.city ?? 'No location yet')
  const detail = status.private
    ? 'Check back later.'
    : status.current
      ? [status.current.region, status.current.country].filter(Boolean).join(', ')
      : 'Check back soon.'
  const badge = status.private
    ? 'PRIVATE'
    : !status.hasData
      ? 'NO UPDATES'
      : status.isHome
        ? 'HOME'
        : 'TRAVELING'
  const plate = status.private ? 'XX' : (status.current?.countryCode ?? '??')
  const cityFontSize = city.length > 16 ? 72 : city.length > 12 ? 90 : 112
  const updated = status.current ? `Updated ${relativeTime(status.current.lastSeenAt)}` : SITE_TAGLINE

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          background: PAGE,
          padding: '64px',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            background: SURFACE,
            borderRadius: 36,
            padding: '48px 56px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div
              style={{
                fontSize: 28,
                fontWeight: 600,
                letterSpacing: -0.5,
                color: TEXT,
              }}
            >
              Where&apos;s Brett?
            </div>
            <div
              style={{
                display: 'flex',
                fontSize: 19,
                fontWeight: 600,
                letterSpacing: 1,
                color: BLUE,
                background: '#e8f2ff',
                borderRadius: 999,
                padding: '9px 16px',
              }}
            >
              {badge}
            </div>
          </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 28, marginTop: 74 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 116,
              height: 116,
              flexShrink: 0,
              borderRadius: 28,
              background: '#f5f5f7',
              color: TEXT,
              fontSize: 42,
              fontWeight: 600,
              letterSpacing: 3,
            }}
          >
            {plate}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div
              style={{ fontSize: cityFontSize, color: TEXT, lineHeight: 1.05, fontWeight: 600 }}
            >
              {city}
            </div>
            <div
              style={{
                fontSize: 28,
                color: MUTED,
                marginTop: 14,
              }}
            >
              {detail}
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            fontSize: 24,
            color: MUTED,
            marginTop: 64,
            paddingTop: 28,
            borderTop: '2px solid #e5e5ea',
          }}
        >
          {updated}
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      headers: {
        'Cache-Control': 'no-store, max-age=0, must-revalidate',
      },
    },
  )
}
