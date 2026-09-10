import { promises as fs } from 'node:fs'
import path from 'node:path'
import type { LocationState } from './types'

const KEY = 'whereisbrett:state'

export const EMPTY_STATE: LocationState = { version: 1, stays: [] }

/**
 * Storage is one small JSON document, so it needs one small key/value store.
 *
 * - In production we talk to Upstash Redis (which is what Vercel KV is) over
 *   its REST API using plain `fetch`. No SDK, no connection pool, no cold-start
 *   cost, and it works unchanged on serverless.
 * - With no store configured we fall back to a JSON file, which is enough for
 *   `next dev` and for tests.
 *
 * Reads never throw: a broken store degrades to the empty state and the site
 * renders its empty state rather than a 500.
 */
type Driver = { name: string; read(): Promise<LocationState>; write(state: LocationState): Promise<void> }

function restCredentials(): { url: string; token: string } | null {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  return { url: url.replace(/\/+$/, ''), token }
}

function redisDriver(credentials: { url: string; token: string }): Driver {
  const command = async (args: string[]): Promise<unknown> => {
    const response = await fetch(credentials.url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${credentials.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(args),
      cache: 'no-store',
    })
    if (!response.ok) {
      throw new Error(`Redis ${args[0]} failed: ${response.status} ${await response.text()}`)
    }
    const payload = (await response.json()) as { result?: unknown; error?: string }
    if (payload.error) throw new Error(`Redis ${args[0]} failed: ${payload.error}`)
    return payload.result
  }

  return {
    name: 'redis',
    async read() {
      const result = await command(['GET', KEY])
      return typeof result === 'string' ? parseState(result) : EMPTY_STATE
    },
    async write(state) {
      await command(['SET', KEY, JSON.stringify(state)])
    },
  }
}

function fileDriver(): Driver {
  const file = process.env.LOCAL_STORE_PATH
    ? path.resolve(process.env.LOCAL_STORE_PATH)
    : path.join(process.cwd(), '.data', 'location.json')

  return {
    name: 'file',
    async read() {
      try {
        return parseState(await fs.readFile(file, 'utf8'))
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') return EMPTY_STATE
        throw error
      }
    },
    async write(state) {
      await fs.mkdir(path.dirname(file), { recursive: true })
      const temp = `${file}.${process.pid}.tmp`
      await fs.writeFile(temp, `${JSON.stringify(state, null, 2)}\n`, 'utf8')
      await fs.rename(temp, file)
    },
  }
}

function driver(): Driver {
  const credentials = restCredentials()
  return credentials ? redisDriver(credentials) : fileDriver()
}

/** Name of the active driver, for the deployment health hint in the README. */
export function storageDriverName(): string {
  return driver().name
}

export async function readState(): Promise<LocationState> {
  try {
    return await driver().read()
  } catch (error) {
    console.error('[storage] read failed, falling back to empty state:', error)
    return EMPTY_STATE
  }
}

export async function writeState(state: LocationState): Promise<void> {
  await driver().write(state)
}

function parseState(raw: string): LocationState {
  const parsed: unknown = JSON.parse(raw)
  if (!parsed || typeof parsed !== 'object') return EMPTY_STATE
  const stays = (parsed as { stays?: unknown }).stays
  if (!Array.isArray(stays)) return EMPTY_STATE
  return { version: 1, stays: stays as LocationState['stays'] }
}
