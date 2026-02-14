# Move Label Manager

Next.js + Prisma moving inventory web app for box labels, QR scanning, status tracking, exports, and offline-lite workflows.

## Stack
- Next.js App Router + Tailwind
- Prisma + Postgres
- Cookie session auth (single user supported)
- PDF/PNG/CSV label exports with provider abstraction
- PWA manifest + service worker cache + offline write queue

## Features Implemented
- Auth (`/login`, session cookies)
- Box CRUD + room code suggestions + short code generation (`BX-000123`)
- Item CRUD + bulk parser (`plates x 8`, `usb cable (3)`)
- Status tracking (`draft`, `packed`, `in_transit`, `delivered`, `unpacked`)
- Photos (local upload fallback with non-persistent warning for Railway)
- Dashboard counters + instant search
- Unpacking queue page
- Scan page with camera QR detection + manual lookup
- Label size presets + custom label sizes + live layout preview
- Template-aware label rendering
- Export providers:
  - `pdf_provider`
  - `png_provider`
  - `csv_provider`
  - `supvan_provider` (PDF/PNG/CSV reuse + workflow guidance)
  - `flashlabel_provider` (PDF/PNG/CSV reuse + workflow guidance)
- Exports:
  - PDF (single label pages, batch, Avery 5160 sheet mode)
  - PNG (single or batch ZIP)
  - CSV
  - Master index PDF
  - Insurance CSV/PDF

## Architecture Overview
### Routes
- Pages:
  - `/dashboard`
  - `/boxes/new`
  - `/boxes/[id]`
  - `/box/[shortCode]`
  - `/labels`
  - `/scan`
  - `/unpacking`
  - `/login`
- API:
  - `/api/auth/login`, `/api/auth/logout`
  - `/api/boxes`, `/api/boxes/[id]`, `/api/boxes/[id]/items`, `/api/boxes/[id]/photos`
  - `/api/search`, `/api/scan`, `/api/bundles`
  - `/api/label-sizes`, `/api/labels/preview`
  - `/api/exports/pdf`, `/api/exports/png`, `/api/exports/csv`
  - `/api/exports/master-index`, `/api/exports/insurance`

### Schema
Core models in `prisma/schema.prisma`:
- `User`
- `LabelSize`
- `Box`
- `Item`
- `Photo`
- `Bundle`
- `ActivityLog`

### Provider Design
`lib/exports/providers.tsx`:
- Common interface by function shape:
  - `exportPDF(boxes, template, labelSize)`
  - `exportPNG(boxes, template, labelSize, dpi)`
  - `exportCSV(boxes)`
- Implementations:
  - Base providers (`pdf_provider`, `png_provider`, `csv_provider`)
  - App-workflow wrappers (`supvan_provider`, `flashlabel_provider`)

## Local Setup
1. Install dependencies:
   - `npm install`
2. Copy env:
   - `cp .env.example .env`
3. Run migrations:
   - `npm run prisma:deploy`
4. Seed data:
   - `npm run seed`
5. Run dev server:
   - `npm run dev`

Default seeded credentials:
- username: `admin`
- password: `move1234`

## Railway Deployment
1. Create Railway project + Postgres service.
2. Set env vars:
   - `DATABASE_URL`
   - `APP_BASE_URL` (production URL)
   - `SESSION_SECRET`
   - optional S3 vars (`S3_ENDPOINT`, `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`)
3. Deploy from repo root (`move/`).
4. Railway start command runs `npm run prisma:deploy && npm run start` (see `railway.json`).
5. Run seed once (Railway shell):
   - `npm run seed`

## Notes
- Local file photo storage (`public/uploads`) is non-persistent on Railway redeploys. Prefer S3-compatible storage for production persistence.
- Offline-lite queues writes in localStorage and syncs when online from box detail.
