import type { Metadata, Viewport } from 'next'
import { SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE, siteUrl } from '@/lib/config'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: `${SITE_NAME} — ${SITE_TAGLINE}`,
    template: `%s — ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    title: 'WHERE IN THE WORLD IS BRETT?',
    description: SITE_TAGLINE,
    url: '/',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'WHERE IN THE WORLD IS BRETT?',
    description: SITE_TAGLINE,
  },
  robots: { index: true, follow: true },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f3ece0' },
    { media: '(prefers-color-scheme: dark)', color: '#07090d' },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="relative antialiased">
        <div aria-hidden className="graticule pointer-events-none fixed inset-0 -z-10" />
        {children}
      </body>
    </html>
  )
}
