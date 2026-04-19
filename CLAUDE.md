# Inventory Manager

A hosted inventory management tool for a liquidation store. Upload auction invoice CSVs, review items on mobile, export internal and Shopify-ready CSVs.

## Tech Stack

- **Framework:** Next.js 16 (App Router, TypeScript)
- **Styling:** Tailwind CSS
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
│   └── api/              # API routes (upload, items, export)
│       └── batches/[id]/verify-pin/ # PIN verification endpoint
├── components/           # React components
│   ├── upload/           # UploadZone, BatchList
│   ├── review/           # CardView, TableView, ItemDetail, etc.
│   ├── export/           # ExportStats, ExportButtons
│   ├── PinModal.tsx      # 4-digit PIN entry modal
│   └── PinGate.tsx       # Client-side PIN gate wrapper
├── lib/                  # Shared utilities
│   ├── types.ts          # TypeScript types
│   ├── csv-parser.ts     # Parse auction invoice CSVs
│   ├── csv-export.ts     # Build export CSVs
│   ├── pin.ts            # Server-only: PIN hashing + master PIN
│   ├── session.ts        # Client-only: sessionStorage helpers
│   └── supabase-*.ts     # Supabase clients
└── hooks/                # React hooks (useItems, useItemUpdate)
└── __tests__/            # Jest test files
```

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

The service role key (`SUPABASE_SERVICE_ROLE_KEY`) is required for all server-side writes — it bypasses row-level security.

## PIN Authentication

Each batch can optionally be protected with a 4-digit PIN set at upload time. PINs are SHA-256 hashed server-side and never sent to the client in plaintext.

- **Upload:** user selects a CSV, enters an optional name and optional 4-digit PIN, then clicks Submit
- **Access (review/export):** PIN prompt appears before content is shown; bypassed if already verified in the current browser session
- **Delete:** PIN required before deletion goes through; sent in the DELETE request body and verified server-side
- **Master PIN:** read from the `MASTER_PIN` environment variable at runtime — never hardcoded. Set it in `.env.local` and in Vercel project settings. Never exposed to the client bundle. If the variable is missing, the master bypass is silently disabled but regular batch PINs still work.
- **Session memory:** once a batch PIN is verified in a tab, it is cached in `sessionStorage` for the lifetime of that tab. The uploader is auto-verified after a successful upload so they don't need to re-enter their own PIN immediately
- Batches with `pin_hash = NULL` (e.g. uploaded without a PIN) are freely accessible — no prompt shown

## Deployment

Deployed to Vercel. The first three environment variables below **must** be set in Vercel project settings before the first deploy — missing vars cause a 500 on upload. `MASTER_PIN` should also be set or the master bypass will be disabled. After adding env vars, trigger a redeploy from the Vercel dashboard.
Price column in Shopify CSV export is intentionally left blank — fill before importing to Shopify.
