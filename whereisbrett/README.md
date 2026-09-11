# Where Is Brett?

A simple travel status page that answers one question immediately:

> **Where's Brett?**
> *A live location, kept current.*

The homepage prioritizes the current city, whether Brett is home or traveling, and a
human-readable "updated" time. Recent locations appear only when there is history to show.
An iPhone Shortcut is the only thing that updates it.

**City-level only.** No latitude, longitude, street address, hotel, or venue is ever
collected, stored, or displayed.

---

## Table of contents

- [Architecture](#architecture)
- [Quick start](#quick-start)
- [Environment variables](#environment-variables)
- [Storage setup](#storage-setup)
- [API](#api)
- [iPhone Shortcut setup](#iphone-shortcut-setup)
- [Running the Shortcut](#running-the-shortcut)
- [Deployment](#deployment)
- [Privacy and security](#privacy-and-security)
- [Development](#development)

---

## Architecture

| Layer | Choice | Why |
| --- | --- | --- |
| Framework | Next.js 15 (App Router) | One deployable unit for the page and the API |
| Language | TypeScript (strict) | |
| Styling | Tailwind CSS 3 | |
| Storage | Upstash Redis over its REST API (`fetch`) | One small JSON document; no SDK, no pool, no cold start |
| Hosting | Railway (Docker) or Vercel | |
| Runtime deps | `next`, `react`, `react-dom`, `zod` | That is the entire list |

All logic lives on the server. The Shortcut sends four strings; the server adds the
timestamp and decides everything else — home vs. traveling, the status copy, duplicate
suppression, history trimming, and the statistics.

```
iPhone Shortcut
  └─ POST /api/location  (Authorization: Bearer …)
       ├─ authorize()          lib/auth.ts        constant-time bearer check
       ├─ parseLocationUpdate() lib/validate.ts   zod: validate, sanitize, drop extra fields
       ├─ applyUpdate()        lib/location.ts    duplicate suppression + history trim
       └─ writeState()         lib/storage.ts     Upstash REST, or a JSON file in dev

Browser
  └─ GET /  (server component, force-dynamic)
       ├─ readState()
       └─ buildPublicStatus()  lib/location.ts    the only thing the public ever sees
```

### Key files

| Path | Purpose |
| --- | --- |
| `app/page.tsx` | The homepage (server component) |
| `app/api/location/route.ts` | `POST` update (authenticated), `GET` public status |
| `app/opengraph-image.tsx` | Live 1200×630 social preview showing the current city |
| `lib/location.ts` | Home detection, duplicate suppression, history, stats, public payload |
| `lib/storage.ts` | Two-driver key/value storage (Upstash REST, JSON file) |
| `lib/auth.ts` | Bearer token check |
| `lib/validate.ts` | Input validation and sanitization |
| `lib/country.ts` | Country name → ISO code, from Node's built-in ICU data |
| `lib/config.ts` | Home city, history size, site URL, `PRIVATE_MODE` |
| `lib/location.test.ts` | Unit tests for all of the above |

### Data model

Storage is a single JSON document under one key. `stays[0]` is always the current
location; the rest is history, newest first, capped at 20 distinct locations.

```json
{
  "version": 1,
  "stays": [
    {
      "city": "Budapest",
      "region": "",
      "country": "Hungary",
      "countryCode": "HU",
      "arrivedAt": "2026-09-08T09:12:44.031Z",
      "lastSeenAt": "2026-09-09T17:40:02.884Z"
    }
  ]
}
```

There is no field for coordinates, and the API strips any it is sent.

---

## Quick start

```bash
cd whereisbrett
npm install
cp .env.example .env.local          # then edit LOCATION_UPDATE_TOKEN
npm run dev                         # http://localhost:3000
```

With no storage configured the app writes to `.data/location.json`, which is enough for
local development. Before the first update the page shows an "awaiting first
transmission" empty state.

Generate a token:

```bash
openssl rand -base64 32
```

Send yourself a test update:

```bash
curl -i -X POST http://localhost:3000/api/location \
  -H "Authorization: Bearer $LOCATION_UPDATE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"city":"Budapest","region":"","country":"Hungary","countryCode":"HU"}'
```

---

## Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `LOCATION_UPDATE_TOKEN` | **Yes** | Bearer token the Shortcut sends. Server-side only. Must be at least 16 characters or the API refuses all writes. |
| `NEXT_PUBLIC_SITE_URL` | In production | Canonical origin, e.g. `https://whereisbrett.com`. Used for Open Graph URLs. The domain is not hard-coded anywhere. |
| `KV_REST_API_URL` | For durable storage | Upstash Redis REST endpoint. Vercel injects this when you attach a store. |
| `KV_REST_API_TOKEN` | For durable storage | Upstash Redis REST token. |
| `UPSTASH_REDIS_REST_URL` | Alternative | Used if the `KV_*` pair is absent. |
| `UPSTASH_REDIS_REST_TOKEN` | Alternative | |
| `PRIVATE_MODE` | No | `1`/`true`/`yes`/`on` hides all whereabouts from the public while still accepting updates. |
| `LOCAL_STORE_PATH` | No | Overrides the local JSON file path. Development only. |

`LOCATION_UPDATE_TOKEN` is deliberately **not** prefixed with `NEXT_PUBLIC_`. Anything
prefixed that way is inlined into the JavaScript bundle and readable by any visitor.

If `NEXT_PUBLIC_SITE_URL` is unset, the app falls back to Vercel's
`VERCEL_PROJECT_PRODUCTION_URL` / `VERCEL_URL`, then to `localhost`.

---

## Storage setup

The app needs one durable key/value pair. Serverless filesystems are read-only and
ephemeral, so the local JSON fallback is *not* durable in production.

### Vercel (recommended)

1. In the Vercel dashboard, open your project → **Storage** → **Create Database**.
2. Choose **Upstash** → **Redis**, pick a region near you, and create it.
3. Connect it to the project. Vercel adds `KV_REST_API_URL` and `KV_REST_API_TOKEN` to
   every environment automatically.
4. Redeploy.

Nothing else is required — there is no schema, no migration, and no client library.

### Upstash directly

Create a Redis database at [upstash.com](https://upstash.com), copy the **REST URL** and
**REST token**, and set them as `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`.

### Anything else

`lib/storage.ts` has one `Driver` interface with `read()` and `write()`. Swapping in
Postgres, S3, or a git-backed file is a single small function.

> The free tier of any of these is far beyond what this needs: one key, a handful of
> writes per day.

---

## API

### `POST /api/location`

Authenticated. The only way to change anything.

**Headers**

```
Authorization: Bearer <LOCATION_UPDATE_TOKEN>
Content-Type: application/json
```

**Body**

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `city` | string | Yes | 1–80 characters after sanitization |
| `region` | string | No | State/province; defaults to `""` |
| `country` | string | Yes | Country name, e.g. `Hungary` |
| `countryCode` | string | No | ISO 3166-1 alpha-2. If omitted, the server derives it from `country`. |

Any other field — including `latitude`, `longitude`, or `address` — is silently
discarded before storage.

```json
{
  "city": "Budapest",
  "region": "",
  "country": "Hungary",
  "countryCode": "HU"
}
```

**Responses**

| Status | Meaning |
| --- | --- |
| `201` | New location recorded |
| `200` | Same city as before — timestamp refreshed, no new history entry |
| `400` | Malformed JSON or invalid payload (details included) |
| `401` | Missing or incorrect bearer token |
| `413` | Body larger than 4 KB |
| `503` | `LOCATION_UPDATE_TOKEN` is unset or too short on the server |

```json
{
  "ok": true,
  "duplicate": false,
  "isHome": false,
  "current": {
    "city": "Budapest",
    "region": "",
    "country": "Hungary",
    "countryCode": "HU",
    "arrivedAt": "2026-09-08T09:12:44.031Z",
    "lastSeenAt": "2026-09-08T09:12:44.031Z"
  },
  "historyCount": 4
}
```

### Sample requests

```bash
# Authorized update
curl -i -X POST https://whereisbrett.com/api/location \
  -H "Authorization: Bearer $LOCATION_UPDATE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"city":"Budapest","region":"","country":"Hungary","countryCode":"HU"}'

# Without countryCode — the server resolves it from the country name
curl -i -X POST https://whereisbrett.com/api/location \
  -H "Authorization: Bearer $LOCATION_UPDATE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"city":"Spokane","region":"Washington","country":"United States"}'

# Unauthorized — expect 401
curl -i -X POST https://whereisbrett.com/api/location \
  -H "Content-Type: application/json" \
  -d '{"city":"Budapest","country":"Hungary"}'

# Public read
curl -s https://whereisbrett.com/api/location
```

### `GET /api/location`

Public and unauthenticated. Returns exactly what the homepage renders, and nothing more.
Honors `PRIVATE_MODE`.

```json
{
  "private": false,
  "isHome": false,
  "hasData": true,
  "current": { "city": "Budapest", "...": "..." },
  "flag": "🇭🇺",
  "headline": "Brett has escaped again.",
  "history": [],
  "stats": {
    "citiesVisited": 7,
    "countriesVisited": 4,
    "streakDaysAway": 12,
    "threatLevel": "CRITICAL"
  }
}
```

---

## iPhone Shortcut setup

The Shortcut is four actions. It gets the current location, pulls three text details out
of it, builds a JSON body, and posts it.

Open **Shortcuts** → **+** → name it **Update Brett**.

### 1. Get Current Location

Add **Get Current Location**.

Grant location permission when prompted. This action runs entirely on your phone; the
coordinates it produces never leave the device, because the next step reads only the
place names off it.

### 2. Get the city, region, and country

Add **Get Details of Location** three times. Each one takes the `Current Location`
variable as input, and you change the detail it returns:

| Action | Set **Get** to | Rename its variable to |
| --- | --- | --- |
| Get Details of Location | **City** | `City` |
| Get Details of Location | **State** | `Region` |
| Get Details of Location | **Country** | `Country` |

To rename a result: tap the action's output variable in a later step, or just refer to
the three magic variables in order — the names below are only for readability.

> **Country code:** you do not need to send one. `POST /api/location` treats
> `countryCode` as optional and derives the ISO code from the country name using the
> standard region data built into the server. That keeps the Shortcut short. If you
> prefer to send it explicitly — or you visit somewhere whose name does not resolve —
> add a `countryCode` key to the dictionary in step 3 with the two-letter code.

### 3. Build the request body

Add **Dictionary** and create three (or four) text keys:

| Key | Value |
| --- | --- |
| `city` | the **City** magic variable |
| `region` | the **Region** magic variable |
| `country` | the **Country** magic variable |
| `countryCode` | *(optional)* two-letter code |

### 4. Post it

Add **Get Contents of URL** and configure it:

- **URL**: `https://whereisbrett.com/api/location`
- **Method**: `POST`
- **Headers**:
  - `Authorization` → `Bearer YOUR_TOKEN_HERE` (the value of `LOCATION_UPDATE_TOKEN`,
    with a single space after `Bearer`)
  - `Content-Type` → `application/json`
- **Request Body**: `JSON`
- **Body**: choose the **Dictionary** variable from step 3

### 5. Optional: confirm it worked

Add **Show Notification** (or **Show Result**) with the output of **Get Contents of URL**
so you can see the response. Handy while setting up; remove it once you trust it.

### Test it

Run the Shortcut. You should see a `201` response the first time and the site should
update immediately. Run it again without moving: the response comes back with
`"duplicate": true`, the timestamp refreshes, and no second history entry appears.

> Keep the token out of anything shared. If you send the Shortcut to someone else,
> Shortcuts includes the header value — rotate `LOCATION_UPDATE_TOKEN` if that happens.

---

## Running the Shortcut

All of the following are supported by iOS today:

| Method | How | Notes |
| --- | --- | --- |
| **Manually** | Open the Shortcuts app and tap it | Always works |
| **Home Screen / widget** | Share sheet → *Add to Home Screen*, or the Shortcuts widget | One tap |
| **Action Button** | Settings → **Action Button** → **Shortcut** → *Update Brett* | iPhone 15 Pro and later |
| **Siri** | "Hey Siri, Update Brett" | The Shortcut's name is the phrase |
| **Back Tap** | Settings → **Accessibility** → **Touch** → **Back Tap** → *Double Tap* | Double- or triple-tap the back of the phone |
| **Control Center** | Add the Shortcuts control | iOS 18 and later |
| **Time of Day automation** | Shortcuts → **Automation** → **+** → **Time of Day** | The most reliable hands-off option. Set it daily and turn **Run Immediately** on so it doesn't ask. |
| **Airplane Mode automation** | Automation → **+** → **Airplane Mode** → *Is Turned Off* | A decent proxy for "just landed" |
| **Wi-Fi automation** | Automation → **+** → **Wi-Fi** → *Joins* a specific network | Useful for a hotel or office network you rejoin |
| **Arrive / Leave automation** | Automation → **+** → **Arrive** or **Leave** | Requires naming specific places on the device. The place never leaves the phone, but you have to configure each one, so this suits home and the airport rather than travel generally. |

**iOS has no "location changed" or "entered a new city" automation trigger**, and no
"flight landed" trigger. Do not go looking for one. A daily **Time of Day** automation
with **Run Immediately** enabled is the closest thing to set-and-forget, and it costs one
request a day. Pair it with the Action Button for when you want to update the moment you
land.

Duplicate suppression is what makes a daily automation safe: re-running it in the same
city only refreshes the timestamp.

---

## Deployment

### Railway

The app ships with its own `Dockerfile` and `railway.json`, so Railway needs no
Nixpacks guesswork.

1. In Railway, **New → GitHub Repo**, pick this repo, then in the service settings set
   **Root Directory** to `whereisbrett`. Railway picks up `whereisbrett/railway.json`
   and builds from `whereisbrett/Dockerfile`.
2. Storage — pick one:
   - **Volume (simplest).** Service → **Volumes** → add one with mount path `/data`.
     The Dockerfile already sets `LOCAL_STORE_PATH=/data/location.json`, so the file
     store is durable across redeploys. Keep the service at one replica (the default).
   - **Upstash Redis.** Set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`
     (or the `KV_*` pair); the file store is then ignored.
3. Add variables:
   - `LOCATION_UPDATE_TOKEN` — output of `openssl rand -base64 32`
   - `NEXT_PUBLIC_SITE_URL` — `https://whereisbrett.com`. If unset, the app falls back
     to Railway's `RAILWAY_PUBLIC_DOMAIN`, which is fine until the custom domain is on.
   - `PRIVATE_MODE` — `false` (or omit)
4. Deploy. Railway sets `PORT`; the container listens on it.
5. **Settings → Networking → Custom Domain**, add `whereisbrett.com`, and point DNS at
   the CNAME Railway gives you. Make sure `NEXT_PUBLIC_SITE_URL` matches.
6. Update the Shortcut's URL to the real domain and run it once.

### Vercel

1. Push this repository to GitHub.
2. In Vercel, **Add New → Project**, import the repo, and set the **Root Directory** to
   `whereisbrett`. The framework preset is detected automatically.
3. Add environment variables (Production, Preview, and Development):
   - `LOCATION_UPDATE_TOKEN` — output of `openssl rand -base64 32`
   - `NEXT_PUBLIC_SITE_URL` — `https://whereisbrett.com`
   - `PRIVATE_MODE` — `false` (or omit)
4. Attach storage: **Storage → Create Database → Upstash Redis**, connect it to the
   project. `KV_REST_API_URL` and `KV_REST_API_TOKEN` appear automatically.
5. Deploy.
6. Add the custom domain under **Settings → Domains** and point `whereisbrett.com` at
   Vercel. Make sure `NEXT_PUBLIC_SITE_URL` matches the domain you actually use, or the
   Open Graph image URL will point at the wrong host.
7. Update the Shortcut's URL to the real domain and run it once.

### Anywhere else

It is a standard Next.js app: `npm run build` then `npm start`, with the same environment
variables. It needs a Node runtime (the API route uses `node:crypto`), not a static host.

### Deployment checklist

- [ ] `LOCATION_UPDATE_TOKEN` set to a long random value, not committed anywhere
- [ ] `NEXT_PUBLIC_SITE_URL` matches the live domain
- [ ] Upstash Redis attached; `KV_REST_API_URL` and `KV_REST_API_TOKEN` present
- [ ] `npm run verify` passes (lint, typecheck, tests, production build)
- [ ] Unauthorized `POST` returns `401`
- [ ] Authorized `POST` returns `201`, and a second identical one returns `200` with
      `"duplicate": true`
- [ ] Homepage shows the new city
- [ ] Paste the URL into Slack and confirm the preview image renders
- [ ] `PRIVATE_MODE=true` hides everything, then set it back

---

## Privacy and security

- **City-level only.** The API accepts four string fields. Latitude, longitude, address,
  and every other field are discarded by the schema before anything is stored. There is
  no code path that persists or renders a coordinate.
- **One writer.** `POST /api/location` requires a bearer token compared with
  `timingSafeEqual`. An unset or short token fails closed with `503` rather than allowing
  an unauthenticated write.
- **Server-only secret.** `LOCATION_UPDATE_TOKEN` is read only inside server code. It is
  not `NEXT_PUBLIC_`, not imported by any client component, and not present in the
  rendered HTML or the JavaScript bundle.
- **Sanitized input.** Strings are stripped of control characters, whitespace-collapsed,
  and length-capped. React escapes them on render.
- **Bounded history.** Only the last 20 distinct locations are kept; older ones fall off.
- **`PRIVATE_MODE`.** Set it to `true` and the site keeps accepting updates but publicly
  shows only *"Brett's current whereabouts are classified."* — the current location,
  history, and statistics are all withheld from the page **and** from
  `GET /api/location`.
- **No third parties.** No analytics, no tracking, no external fonts or images. Flags are
  emoji derived from the country code, so there is no branded artwork of any kind.

To rotate the token: change `LOCATION_UPDATE_TOKEN` in your host's variables, redeploy, and update the
`Authorization` header in the Shortcut.

---

## Development

```bash
npm run dev         # dev server
npm run lint        # eslint
npm run typecheck   # tsc --noEmit
npm test            # node:test unit tests
npm run build       # production build
npm run verify      # all of the above, in order
```

Change the home city in `lib/config.ts` (`HOME`), the history size with `MAX_HISTORY`,
and the status copy in `lib/status.ts`.

Storage during development goes to `.data/location.json`, which is gitignored. Delete it
to get the empty state back.
