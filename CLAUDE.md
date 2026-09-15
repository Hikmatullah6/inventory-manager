# Inventory Manager

A hosted inventory management tool for a liquidation store. Upload auction invoice CSVs, review items on mobile, export internal and Shopify-ready CSVs.

## Tech Stack

- **Framework:** Next.js 16 (App Router, TypeScript)
- **Styling:** Tailwind CSS v4
- **Database:** Supabase (Postgres)
- **Deployment:** Vercel

## Getting Started

1. Copy `.env.example` to `.env.local` and fill in your Supabase credentials
2. Run `npm install`
3. Run `npm run dev` — app runs at http://localhost:3000

## Key Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm test` | Run Jest tests |
| `npm run lint` | ESLint |

## Project Structure

```
src/
├── app/                  # Next.js App Router pages + API routes
│   ├── page.tsx          # Upload screen (home)
│   ├── review/[batchId]/ # Item review screen (dad's phone)
│   ├── export/[batchId]/ # CSV export screen
│   ├── loading.tsx       # Skeletons, one per slow route
│   └── api/              # API routes
│       ├── upload/, items/, export/
│       ├── items/counts/ # Per-status totals for the mobile filter chips
│       ├── thumbnail/    # Item-photo proxy (see "Item photos")
│       └── batches/[id]/ # GET one batch, DELETE it, verify-pin/
├── components/           # React components
│   ├── upload/           # UploadZone, BatchList
│   ├── review/           # ReviewClient, TableView (desktop table + phone
│   │                     # layouts), MobileItemList, MobileDetailPane,
│   │                     # CardView, ItemDetail, ReviewHeader, SearchFilter
│   ├── export/           # ExportStats, ExportButtons
│   ├── PinModal.tsx      # 4-digit PIN entry modal
│   ├── PinGate.tsx       # Client-side PIN gate wrapper
│   └── Skeleton.tsx      # Loading skeletons used by the loading.tsx files
├── lib/                  # Shared utilities
│   ├── types.ts          # TypeScript types
│   ├── batches.ts        # Server-side batch list with counts
│   ├── item-status.ts    # Status labels, badges, dots, options
│   ├── item-counts.ts    # Per-status totals behind the filter chips
│   ├── thumbnail.ts      # Builds the proxied item-photo URL
│   ├── csv-parser.ts     # Parse auction invoice CSVs
│   ├── csv-export.ts     # Build export CSVs
│   ├── pin.ts            # Server-only: PIN hashing + master PIN
│   ├── session.ts        # Client-only: sessionStorage helpers
│   └── supabase-*.ts     # Supabase clients
└── hooks/                # useItems (accepts server-rendered initialData),
                          # useItemUpdate, useItemForm
└── __tests__/            # Jest test files
```

## Performance

Supabase round trips dominate every page, so: fetch in parallel, count instead of
downloading, and render on the server.

- `/` and `/review/[batchId]` resolve their data server-side in one `Promise.all`
  and pass it into the client component as props. Both used to fetch after mount
  — the review screen fetched *every* batch in the account (two count queries
  each) just to find one, then fetched items, showing a blank screen throughout.
- The export page counts statuses with head-only queries instead of downloading
  every row to tally it.
- `/` sets `export const dynamic = 'force-dynamic'`. Without it Next prerenders
  the batch list at build time and the review counts freeze at deploy.
- `loading.tsx` files render a skeleton the instant a link is tapped.
- When adding a screen, put the first paint's data on the server side of the
  client boundary.

## Item photos

Auction thumbnails are proxied through `/api/thumbnail`; `src/lib/thumbnail.ts`
builds the URL and `ItemDetail` uses it. hibid's CDN returns 403 to any request
that does not look like a browser, so a content blocker, a privacy browser or a
trimmed User-Agent otherwise leaves the photo blank. The proxy allow-lists image
hosts by suffix — it must never become an open proxy — and any host not on the
list is loaded directly.

## Mobile

The review screen is used on a phone, in a warehouse, by someone who is not
looking for small targets. Keep it that way:

- Tap targets are `min-h-11` (44px). Do not add a `py-1.5` button.
- Inputs and selects are `text-base` (16px). Safari zooms the whole page in on
  focus for anything smaller and does not zoom back out.
- Nothing below 14px on the review screen, except the 12px rail SKU and
  quantity labels the handoff calls for.
- Nothing scrolls sideways. The page overflow is 0 at 375px on every screen.

### The two review layouts

`TableView` renders both and chooses with CSS (`sm:hidden` / `hidden sm:flex`),
not JS — a JS breakpoint check would mismatch on hydration.

- **`sm:` and up** — the five-column table with the 320px detail panel. Do not
  change this; the phone work lives entirely below the breakpoint.
- **Below `sm:`** — `MobileItemList` (full-width 64px rows: status dot, title,
  SKU + quantities, status pill, chevron), and once a row is tapped
  `MobileDetailPane` — a 72px rail of SKUs plus every field from `ItemDetail`
  reflowed for ~298px. Same screen, no route change, no modal.

In table view on a phone, `ReviewClient`'s shell is a fixed-height flex column
(`h-dvh … overflow-hidden`) so the rail and the detail body scroll separately.
Card view and every width from `sm:` up keep normal document flow.

`ItemDetail` and `MobileDetailPane` share their state through
`useItemForm` — two layouts, one set of rules about what an edit means. Both are
keyed on `item.id` by their caller, so a new item starts from fresh state
instead of needing a resync effect.

### Filter chips

Below `sm:` the status dropdown becomes a scrolling row of chips with live
counts. Those counts come from `/api/items/counts` (`src/lib/item-counts.ts`),
never from the loaded page — that page is 50 rows out of several thousand. They
are recounted when the search term changes and adjusted locally on a status tap,
so marking an item does not cost a round trip.

## Environment Variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-only) |
| `MASTER_PIN` | 4-digit admin PIN that bypasses all batch PINs (server-only) |

## CSV Import

The parser handles Google Sheets exports with:
- A title row before the actual column headers (scans first 10 rows to find headers)
- Auction date ranges like `1/22/2026 - 1/27/2026` — start stored in `auction_date`, end in `auction_date_end`; exported as `2026-01-22 - 2026-01-27`
- `M/D/YYYY`, `MM/DD/YYYY`, `M/D/YY`, and `MM/DD/YY` date formats (converted to `YYYY-MM-DD` for Postgres)
- BOM characters and tab-separated values

Required columns: `SKU`, `Title`. All others are optional.

`public/example-inventory.csv` is a 20-product sample file covering all supported columns. It is linked on the home page as a download for new users — do not delete or rename it.

## Database

Managed in Supabase. Migrations live in `supabase/migrations/` — apply each in order via the Supabase dashboard SQL Editor:
- `001_initial.sql` — base schema
- `002_auction_date_range.sql` — adds `auction_date_end date` column to items
- `003_pin_auth.sql` — adds `pin_hash text` column to `auction_batches`
- `004_sold_personal_use.sql` — adds `sale_price numeric` column to items; expands status check constraint to include `sold` and `personal_use`

The service role key (`SUPABASE_SERVICE_ROLE_KEY`) is required for all server-side writes — it bypasses row-level security.

## Item Statuses

Each item has one of seven statuses set during review:

| Status | Meaning | Appears in export |
|---|---|---|
| `pending` | Not yet reviewed (default) | Excluded from all exports |
| `have_it` | In stock and sellable | Inventory CSV, Shopify CSV |
| `dont_have` | Not found / missing | Excluded from all exports |
| `broken` | Damaged | Inventory CSV only |
| `partial` | Incomplete set | Inventory CSV, Shopify CSV |
| `sold` | Already sold | Sold CSV only |
| `personal_use` | Kept for personal use | Personal Use CSV only |

`sale_price` is an optional numeric field on items — visible and editable inline when status is `sold`.

## PIN Authentication

Each batch can optionally be protected with a 4-digit PIN set at upload time. PINs are SHA-256 hashed server-side.

**The hash itself never reaches the browser.** A 4-digit PIN has 10,000 possible
values, so its SHA-256 is brute-forced offline in milliseconds — shipping the
hash is equivalent to shipping the PIN. `AuctionBatch` carries `has_pin: boolean`
instead, and `PinGate` takes `hasPin`. Keep `pin_hash` in server-only `select`s.

- **Upload:** user selects a CSV, enters an optional name and optional 4-digit PIN, then clicks Submit
- **Access (review/export):** PIN prompt appears before content is shown; bypassed if already verified in the current browser session
- **Delete:** PIN required before deletion goes through; sent in the DELETE request body and verified server-side
- **Master PIN:** read from the `MASTER_PIN` environment variable at runtime — never hardcoded. Set it in `.env.local` and in Vercel project settings. Never exposed to the client bundle. If the variable is missing, the master bypass is silently disabled but regular batch PINs still work.
- **Session memory:** once a batch PIN is verified in a tab, it is cached in `sessionStorage` for the lifetime of that tab. The uploader is auto-verified after a successful upload so they don't need to re-enter their own PIN immediately
- Batches with `pin_hash = NULL` (e.g. uploaded without a PIN) are freely accessible — no prompt shown; the client sees this as `has_pin: false`

## CSV Exports

The export page (`/export/[batchId]`) has four tabs:

| Tab | API route | Items included |
|---|---|---|
| Inventory | `/api/export/[batchId]/internal` | have_it, broken, partial |
| Shopify | `/api/export/[batchId]/shopify` | have_it, partial |
| Sold | `/api/export/[batchId]/sold` | sold |
| Personal Use | `/api/export/[batchId]/personal-use` | personal_use |

All export routes use paginated Supabase queries (1000 rows/page) so they are not subject to the server-side `max_rows` cap. The Shopify CSV leaves the Price column blank — fill before importing to Shopify.

## Design handoffs

`design_handoff_mobile_table/` holds the prototype and spec behind the phone
layout above. It supersedes an earlier handoff that proposed a full light-theme
rebuild of every screen — **that direction was tried and dropped.** The dark
palette stays; keep new work inside the existing Tailwind classes.

## Deployment

Deployed to Vercel. The first three environment variables below **must** be set in Vercel project settings before the first deploy — missing vars cause a 500 on upload. `MASTER_PIN` should also be set or the master bypass will be disabled. After adding env vars, trigger a redeploy from the Vercel dashboard.
