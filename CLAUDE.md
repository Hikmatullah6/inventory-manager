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
├── components/           # React components
│   ├── upload/           # UploadZone, BatchList
│   ├── review/           # CardView, TableView, ItemDetail, etc.
│   └── export/           # ExportStats, ExportButtons
├── lib/                  # Shared utilities
│   ├── types.ts          # TypeScript types
│   ├── csv-parser.ts     # Parse auction invoice CSVs
│   ├── csv-export.ts     # Build export CSVs
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

## CSV Import

The parser handles Google Sheets exports with:
- A title row before the actual column headers (scans first 10 rows to find headers)
- Auction date ranges like `1/22/2026 - 1/27/2026` — start stored in `auction_date`, end in `auction_date_end`; exported as `2026-01-22 - 2026-01-27`
- `M/D/YYYY`, `MM/DD/YYYY`, `M/D/YY`, and `MM/DD/YY` date formats (converted to `YYYY-MM-DD` for Postgres)
- BOM characters and tab-separated values

Required columns: `SKU`, `Title`. All others are optional.

## Database

Managed in Supabase. Migrations live in `supabase/migrations/` — apply each in order via the Supabase dashboard SQL Editor:
- `001_initial.sql` — base schema
- `002_auction_date_range.sql` — adds `auction_date_end date` column to items

The service role key (`SUPABASE_SERVICE_ROLE_KEY`) is required for all server-side writes — it bypasses row-level security.

## Deployment

Deployed to Vercel. All three environment variables **must** be set in Vercel project settings before the first deploy — missing vars cause a 500 on upload (the upload route validates them explicitly and returns a clear error if absent).
After adding env vars, trigger a redeploy from the Vercel dashboard.
Price column in Shopify CSV export is intentionally left blank — fill before importing to Shopify.
