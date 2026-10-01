# Inventory Manager

A hosted inventory management tool for a liquidation store. Upload the inventory
sheet, search and review items on a phone, export one Excel workbook in the same
shape you imported.

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
│   ├── export/[batchId]/ # Export screen
│   ├── loading.tsx       # Skeletons, one per slow route
│   └── api/              # API routes
│       ├── upload/, items/, export/
│       ├── items/counts/ # Per-status totals for the mobile filter chips
│       ├── items/facets/ # Distinct values behind the filter pickers
│       ├── thumbnail/    # Item-photo proxy (see "Item photos")
│       └── batches/[id]/ # GET one batch, DELETE it, verify-pin/
├── components/           # React components
│   ├── upload/           # UploadZone, BatchList
│   ├── review/           # ReviewClient, TableView (desktop table + phone
│   │                     # layouts), MobileItemList, MobileDetailPane,
│   │                     # CardView, ItemDetail, CollapsibleSection,
│   │                     # ReviewHeader, SearchFilter, FilterSheet, ChipInput
│   ├── export/           # ExportStats, ExportButtons
│   ├── PinModal.tsx      # 4-digit PIN entry modal
│   ├── PinGate.tsx       # Client-side PIN gate wrapper
│   └── Skeleton.tsx      # Loading skeletons used by the loading.tsx files
├── lib/                  # Shared utilities
│   ├── types.ts          # TypeScript types
│   ├── batches.ts        # Server-side batch list with counts
│   ├── item-status.ts    # Status labels, badges, dots, options
│   ├── item-query.ts     # THE filters/sort/search builder — see "Queries"
│   ├── item-counts.ts    # Per-status totals behind the filter chips
│   ├── item-facets.ts    # Distinct values behind the filter pickers
│   ├── item-update.ts    # PATCH allow-list + coercion
│   ├── multi-value.ts    # The split/join pair for subcategory + tags
│   ├── thumbnail.ts      # Builds the proxied item-photo URL
│   ├── csv-parser.ts     # Parse the 18-column import sheet
│   ├── xlsx-export.ts    # The export workbook (one sheet per status)
│   ├── pin.ts            # Server-only: PIN hashing + master PIN
│   ├── session.ts        # Client-only: sessionStorage helpers
│   └── supabase-*.ts     # Supabase clients
└── hooks/                # useItems (accepts server-rendered initialData),
                          # useItemUpdate, useItemForm, useDetailsOpen,
                          # useCostVisible
└── __tests__/            # Jest test files
```

## Performance

Supabase round trips dominate every page, so: fetch in parallel, count instead of
downloading, and render on the server.

- `/` and `/review/[batchId]` resolve their data server-side in one `Promise.all`
  and pass it into the client component as props. The review page's is six
  queries: batch, total, reviewed, the first page, the chip counts and the filter
  facets. Both screens used to fetch after mount — the review screen fetched
  *every* batch in the account (two count queries each) just to find one, then
  fetched items, showing a blank screen throughout.
- The export page counts statuses with head-only queries instead of downloading
  every row to tally it.
- `/` sets `export const dynamic = 'force-dynamic'`. Without it Next prerenders
  the batch list at build time and the review counts freeze at deploy.
- `loading.tsx` files render a skeleton the instant a link is tapped.
- The filter pickers' values come from one `item_facets()` call, which dedupes
  inside Postgres. Deriving them in the browser would mean downloading the batch
  — `subcategory` and `tags` are arrays, so there is no counting shortcut.
  `getItemFacets` swallows its own errors and returns empty facets: it sits in
  that `Promise.all`, so a throw would take the whole screen to a 500, which is
  exactly what would happen between a deploy and migration 005 being applied.
- When adding a screen, put the first paint's data on the server side of the
  client boundary.

### Queries

`src/lib/item-query.ts` builds **every** item query: the filters, the search, the
sort whitelist and the page window. `/api/items`, the seven count queries in
`item-counts.ts` and the review page's server-rendered first page all go through
it.

They used to each have their own copy — the search predicate written out twice
verbatim and the first-page query reimplemented a third time, held in agreement
by a comment. That is what made `useItems` able to seed a cache key describing
rows other than the ones on screen, and it would not have survived five more
filters.

- Search is one `ilike` on the generated `search_text` column (`sku || ' ' ||
  title`), not a two-column `or()`. The user's term used to be interpolated raw
  into PostgREST's `or()` grammar, where a comma started a new condition and `%`
  matched everything; with one column there is no grammar left to escape, and
  `escapeLikeTerm` only neutralises LIKE's own wildcards.
- `subcategory` and `tags` filter with `overlaps` (`&&`) — "match **any** of the
  selected values" — which is what their GIN indexes serve.
- `applySort` always appends `id` as a tiebreak, or an item could appear on two
  pages.
- `applyItemFilters(..., { includeStatus: false })` is for the counts: they fix
  the status per chip and apply every other filter, so a chip's count equals what
  tapping it produces. If that option ever defaults the other way, all seven
  chips show the same number.

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

### The Details section

Marking an item is a status tap, so that is nearly all either layout shows by
default: photo, editable title, chips, status grid, **Quantity and Price**, and
Sale Price when the status is `sold`. Quantity is the number corrected on the
floor and Price is the one quoted to a customer, so both stay out of the
disclosure.

Everything else — Condition, Est. Retail, Season, Category, Subcategory, Tags,
Description, Shelf / Location, Notes — sits inside one `CollapsibleSection`
titled **Details**, collapsed. Ten editable fields is a lot to scroll past to
reach a status button.

- The open flag is `useDetailsOpen` — a module-level value mirrored into
  `localStorage`, not component state. Both detail components are keyed on
  `item.id`, so local state would collapse again on every item, and `TableView`
  renders the phone and desktop layouts at once: one value keeps them in
  agreement. It is read after mount, never in a `useState` initializer — the
  review screen is server-rendered and a storage read during the first render is
  a hydration mismatch.
- It never auto-expands. An item with data already in those fields shows
  `Details · N filled` instead (`countFilledDetails` in `useItemForm`), so the
  layout does not jump between items.

`useItemForm` owns every editable field and both layouts read it, so there is one
set of rules about what an edit means. `ChipInput` is the editor for the two
multi-value fields; it commits the whole array in one write, and a typed comma
commits too, because that is how a cell gets pasted out of the sheet.

### Hiding cost

The review screen gets walked through with customers standing next to it, so
`cost` starts **hidden** and the eye in `ReviewHeader` reveals it.
`estimated_retail` and `price` are not hidden — those are the numbers you quote.

- `useCostVisible` is module-level, like `useDetailsOpen`, for the same two
  reasons: both detail components are keyed on `item.id`, and `TableView` renders
  both layouts at once.
- **It persists nothing, deliberately.** Any storage survives a reload in the same
  tab, so a reload would restore *shown* — the one state it must never come back
  in. A module value resets on every full page load while still surviving
  client-side navigation between `/review` and `/export`.
- The server snapshot is `false`, so cost is absent from the HTML and the first
  paint and can never flash up.
- The toggle is in the header, not the filter row: on a phone the filter row is
  hidden while the detail pane is open, and the pane is where cost is rendered.
  It is in the header's *second* row — the first is already Back + name + three
  buttons at 375px.

### Filter chips

Below `sm:` the status dropdown becomes a scrolling row of chips with live
counts. Those counts come from `/api/items/counts` (`src/lib/item-counts.ts`),
never from the loaded page — that page is 50 rows out of several thousand. They
are recounted when the search or the facet filters change, and adjusted locally
on a status tap, so marking an item does not cost a round trip.

### The facet filters

Date bought, category, subcategory, tags and season live in `FilterSheet`, opened
by a `Filters · N` button present in both layouts. Status stays chips — it is the
primary axis and the only filter with live counts.

- Five pickers do not fit in the chip rail, and a second horizontal scroller
  would fight the rail for the same gesture. So below `sm:` the sheet is a bottom
  drawer (`max-h-[85dvh]`, sticky Clear / Show items footer) and at `sm:` and up
  the same body renders as a dropdown panel. The caller passes `variant`, so only
  one dialog is in the tree per breakpoint.
- Selections are held in the sheet and committed once, so filtering costs one
  refetch per visit to the sheet rather than one per tap.
- `dateBought` is a multi-select of the batch's actual purchase dates, not a
  from/to range: a batch is one or a few buying trips, so the distinct values are
  short and already in the facets payload, and all five filters stay one control
  type. Newest-first and oldest-first are in the **sort**, not here.
- Every filter matches **any** of its selected values.

## Environment Variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-only) |
| `MASTER_PIN` | 4-digit admin PIN that bypasses all batch PINs (server-only) |

## CSV Import

The import sheet is 18 columns, headers on row 1, data from row 2:

| Header | Column | Notes |
|---|---|---|
| `sku` | `sku` | **required** |
| `title` | `title` | **required** |
| `description` | `description` | |
| `condition` | `condition` | |
| `cost` | `cost` | what we paid — hidden behind the eye toggle |
| `estimated retail` | `estimated_retail` | |
| `price` | `price` | what we ask |
| `link` | `link` | |
| `thumbnail link` | `thumbnail_url` | |
| `date bought` | `date_bought` | |
| `company` | `company_name` | |
| `location bought` | `location_bought` | |
| `auction date` | `auction_date` + `auction_date_end` | a range splits into both |
| `category` | `category` | |
| `subcategory` | `subcategory` | comma-separated, `text[]` |
| `tags` | `tags` | comma-separated, `text[]` |
| `season` | `season` | |
| `quantity` | `quantity` | how many the lot should contain |

**`cost` and `price` are different things.** An earlier `COLUMN_MAP` mapped the
header `price` onto `cost`; the sheet now carries both and conflating them is
silent data loss. `csv-parser.test.ts` guards this specifically.

Also handled:
- A title row before the headers (scans the first 10 rows to find them)
- `M/D/YYYY`, `MM/DD/YYYY`, `M/D/YY`, `MM/DD/YY` and `YYYY-MM-DD` dates
- Auction date ranges with a **spaced** dash (`2026-01-22 - 2026-01-27`) or an
  unspaced slash range (`1/22/2026-1/27/2026`). The separator must be spaced for
  ISO dates — they contain hyphens themselves, and splitting on any hyphen is
  what used to make the export's own range unreadable on re-import
- BOM characters and tab-separated values
- `0` is a real value for `cost`, `price` and `quantity`, not "unset"

`subcategory`/`tags` split and join through one pair of functions in
`src/lib/multi-value.ts`, shared by the parser and the exporter so they cannot
drift. A consequence: an individual value can never contain a comma.

`public/example-inventory.csv` is a 20-product sample covering all 18 columns
(including blanks, a zero cost, a zero quantity and multi-value cells). It is
linked on the home page as a download for new users — do not delete or rename it,
and `csv-parser.test.ts` parses it to make sure it stays valid.

## Database

Managed in Supabase. Migrations live in `supabase/migrations/` — apply each in order via the Supabase dashboard SQL Editor:
- `001_initial.sql` — base schema
- `002_auction_date_range.sql` — adds `auction_date_end date` column to items
- `003_pin_auth.sql` — adds `pin_hash text` column to `auction_batches`
- `004_sold_personal_use.sql` — adds `sale_price numeric` column to items; expands status check constraint to include `sold` and `personal_use`
- `005_new_import_format.sql` — the 18-column sheet: adds `condition`,
  `estimated_retail`, `price`, `category`, `season`, `quantity`, and
  `subcategory`/`tags` as `text[] NOT NULL DEFAULT '{}'`; adds the generated
  `search_text` column with a trigram index; indexes every new filter; drops two
  indexes nothing queried; adds the `item_facets()` function. **Apply it before
  deploying** — `overlaps`, the `search_text` filter and the rpc all fail against
  the old schema.

`qty_good` / `qty_broken` / `qty_sold` are **retired**: nothing reads or writes
them and they are not in the export, but the columns and their data remain.
`qty_sold` keeps `NOT NULL DEFAULT 0` because the upload no longer sends it —
drop that default and every upload fails.

The service role key (`SUPABASE_SERVICE_ROLE_KEY`) is required for all server-side writes — it bypasses row-level security.

## Item Statuses

Each item has one of seven statuses set during review:

| Status | Meaning |
|---|---|
| `pending` | Not yet reviewed (default) |
| `have_it` | In stock and sellable |
| `dont_have` | Not found / missing |
| `broken` | Damaged |
| `partial` | Incomplete set |
| `sold` | Already sold |
| `personal_use` | Kept for personal use |

Every status gets its own sheet in the export (see **Exports**), so none is
excluded any more. A status is settable from six buttons — `pending` is the
initial state and is not offered.

### The three money fields

| Field | Meaning | On screen |
|---|---|---|
| `cost` | What we paid | Read-only, **hidden by default** — see **Hiding cost** |
| `estimated_retail` | What it retails for | Editable |
| `price` | What we ask | Editable, and on the phone list row |
| `sale_price` | What it actually sold for | Editable only when the status is `sold` |

`cost` and `price` are not the same column and never were meant to be — see
**CSV Import**. `quantity` is how many the lot was meant to contain, editable so
it can be corrected to what arrived.

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
- **The cookie is what the server trusts.** `PinGate` and `ReviewClient` only hide
  things in the browser, so the PIN is also proved server-side: a successful
  `verify-pin` (and an upload) sets an httpOnly `ba_<batchId>` cookie — an HMAC
  of the batch id keyed by the service role key — and a master PIN also sets
  `ba_master`, which opens every batch. `src/lib/batch-access.ts` is the only
  place that mints or checks one.
  - Export routes call `requireBatchAccess` (plain-text 401, because a download
    is a navigation and the person reads the response).
  - `/api/items`, `/api/items/counts` and `/api/items/facets` call
    `denyUnlessBatchAccess`.
  - `PATCH /api/items/[id]` takes `batch_id` in the body and checks the cookie
    for it, scoping the update to that batch — one round trip, because this runs
    on every tap. Without a matching cookie it falls back to looking the item's
    batch up. It then keeps **only** the fields in `EDITABLE_ITEM_FIELDS`
    (`src/lib/item-update.ts`), coercing each to its column's shape; before that
    allow-list existed the body's keys went straight to Supabase, so any column
    in the row was writable.
  - `/review/[batchId]` and `/export/[batchId]` check the cookie themselves and
    pass `null` counts and items when it is missing, so a locked batch's rows are
    never in the HTML. The client fetches them once the PIN is entered; the
    export page re-renders through `router.refresh()`.
  - A tab that unlocked a batch before the cookie existed still holds the PIN in
    `sessionStorage` and re-mints quietly. One that doesn't gets the prompt
    rather than an empty screen.
- **Downloading an export re-prompts for the PIN**, even in a tab that already
  unlocked the batch, so a customer holding the phone cannot tap Export. This is
  a shoulder-surfing guard, not a new boundary: the server still trusts the
  cookie, so the URL typed directly would still work. `ExportButtons` reuses
  `PinModal` (`mode="export"`), which hits the same `verify-pin` route. A batch
  with `pin_hash = NULL` downloads with no prompt — `verifyPin` returns true for
  any input there, so a prompt would accept anything and teach the wrong lesson.

## Exports

One download: `/api/export/[batchId]/workbook` builds a single `.xlsx` with
`exceljs` (`src/lib/xlsx-export.ts`) — **the same 18 columns as the import
sheet, in import order, with the import's own lowercase headers**, one sheet per
status, named via `STATUS_SHORT`, in the order Have It, Partial, Broken, Sold,
Personal Use, Don't Have, Pending. Empty statuses get no sheet; an empty batch
still gets one sheet (`Items`), because a sheetless workbook will not open.

This replaced four CSV routes (Inventory / Shopify / Sold / Personal Use) and
`src/lib/csv-export.ts`. Do not reintroduce them — the point is that an export
can be edited and re-imported.

- The query is paginated at 1000 rows/page (`fetchAllItemsForExport` in
  `item-query.ts`) so it is not subject to the server-side `max_rows` cap.
- Only `http(s)` URLs become clickable links.
- Dates are written as **text**, not Excel Dates: a real Date is re-rendered in
  the viewer's locale and the re-import would then depend on who opened the file.
- `autoFilter` is derived from the column count, so adding a column cannot leave
  it covering part of the header row.
- Nothing in the type system ties `EXPORT_COLUMNS` to the parser's `COLUMN_MAP`.
  The round-trip test in `src/__tests__/xlsx-export.test.ts` is what holds them
  together — it exports items, re-parses each sheet and compares field by field.
  If you rename a header, that is the test that should fail.

**The export is not a backup.** Four things the 18 columns cannot carry:
`status` (it lives in the sheet name, so re-importing resets every row to
`pending`), `shelf_location`, `notes` and `sale_price`. `auction_date_end` does
survive, inside the `auction date` range string.

## Design handoffs

`design_handoff_mobile_table/` holds the prototype and spec behind the phone
layout above. It supersedes an earlier handoff that proposed a full light-theme
rebuild of every screen — **that direction was tried and dropped.** The dark
palette stays; keep new work inside the existing Tailwind classes.

## Deployment

Deployed to Vercel. The first three environment variables below **must** be set in Vercel project settings before the first deploy — missing vars cause a 500 on upload. `MASTER_PIN` should also be set or the master bypass will be disabled. After adding env vars, trigger a redeploy from the Vercel dashboard.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
