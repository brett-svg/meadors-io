import { NextResponse } from 'next/server'
import { authorize } from '@/lib/auth'
import { isPrivateMode } from '@/lib/config'
import { applyUpdate, buildPublicStatus, isHome } from '@/lib/location'
import { readState, writeState } from '@/lib/storage'
import { parseLocationUpdate } from '@/lib/validate'

// `timingSafeEqual` and the filesystem fallback both need Node, and this route
// must never be cached or prerendered.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** A city update is a few hundred bytes; anything larger is not a real update. */
const MAX_BODY_BYTES = 4096

const NO_STORE = { 'cache-control': 'no-store' }

/** Public, unauthenticated read of exactly what the homepage shows. */
export async function GET() {
  const state = await readState()
  return NextResponse.json(buildPublicStatus(state, { private: isPrivateMode() }), {
    headers: NO_STORE,
  })
}

/** The single write path, used only by the iPhone Shortcut. */
export async function POST(request: Request) {
  const auth = authorize(request)
  if (!auth.ok) {
    if (auth.reason === 'unconfigured') {
      console.error('[api/location] LOCATION_UPDATE_TOKEN is missing or too short; refusing writes')
      return problem(503, 'Location updates are not configured on this deployment.')
    }
    return problem(401, 'Invalid or missing bearer token.')
  }

  const raw = await request.text()
  if (Buffer.byteLength(raw, 'utf8') > MAX_BODY_BYTES) {
    return problem(413, 'Request body too large.')
  }

  let body: unknown
  try {
    body = JSON.parse(raw)
  } catch {
    return problem(400, 'Body must be valid JSON.')
  }

  const parsed = parseLocationUpdate(body)
  if (!parsed.ok) {
    return problem(400, 'Invalid location payload.', parsed.errors)
  }

  const before = await readState()
  const { state, duplicate, current } = applyUpdate(before, parsed.place)
  await writeState(state)

  // The response confirms what was stored so the Shortcut can show a
  // notification. It contains no data the public endpoint wouldn't return.
  return NextResponse.json(
    {
      ok: true,
      duplicate,
      isHome: isHome(current),
      current,
      historyCount: state.stays.length,
    },
    { status: duplicate ? 200 : 201, headers: NO_STORE },
  )
}

function problem(status: number, message: string, details?: string[]) {
  return NextResponse.json(
    details ? { ok: false, error: message, details } : { ok: false, error: message },
    { status, headers: NO_STORE },
  )
}
