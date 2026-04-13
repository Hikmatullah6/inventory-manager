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
```

## Environment Variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-only) |

## Database

Managed in Supabase. Schema lives in `supabase/migrations/001_initial.sql`.
Apply by running the SQL in the Supabase dashboard SQL Editor.

## Deployment

Deployed to Vercel. Set the three environment variables above in Vercel project settings.
Price column in Shopify CSV export is intentionally left blank — fill before importing to Shopify.
