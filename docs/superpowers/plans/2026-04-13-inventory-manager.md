# Inventory Manager Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a hosted Next.js + Supabase inventory manager for a liquidation store — upload auction invoice CSVs, let dad review items on his phone, export internal + Shopify-ready CSVs.

**Architecture:** Next.js 14 App Router with API routes handles both frontend and backend. Supabase (Postgres) stores all items with server-side filtering/pagination for 1500+ rows. Vercel hosts the app; no auth in v1.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, Supabase (`@supabase/ssr`, `@supabase/supabase-js`), PapaParse, Jest, React Testing Library, `gh` CLI, Vercel CLI.

---

## File Structure

```
inventory-manager/
├── .env.example
├── .gitignore
├── next.config.ts
├── tailwind.config.ts
├── jest.config.ts
├── jest.setup.ts
├── src/
│   ├── app/
│   │   ├── layout.tsx                        # Root layout, metadata
│   │   ├── page.tsx                          # Upload screen
│   │   ├── review/[batchId]/page.tsx         # Review screen
│   │   ├── export/[batchId]/page.tsx         # Export screen
│   │   └── api/
│   │       ├── batches/route.ts              # GET all batches with counts
│   │       ├── upload/route.ts               # POST CSV → insert items
│   │       ├── items/route.ts                # GET items (search/filter/page)
│   │       ├── items/[id]/route.ts           # PATCH single item
│   │       └── export/[batchId]/
│   │           ├── internal/route.ts         # GET internal CSV download
│   │           └── shopify/route.ts          # GET Shopify CSV download
│   ├── components/
│   │   ├── upload/
│   │   │   ├── UploadZone.tsx               # Drag & drop CSV uploader
│   │   │   └── BatchList.tsx                # Previous uploads list
│   │   ├── review/
│   │   │   ├── ReviewHeader.tsx             # Progress bar + view toggle
│   │   │   ├── SearchFilter.tsx             # Search bar + status dropdown
│   │   │   ├── ItemDetail.tsx               # Shared status/qty/location form
│   │   │   ├── CardView.tsx                 # Card-by-card image-forward view
│   │   │   └── TableView.tsx                # Table + slide-out panel
│   │   └── export/
│   │       ├── ExportStats.tsx              # Count summary
│   │       └── ExportButtons.tsx            # Download CSV buttons
│   ├── lib/
│   │   ├── types.ts                         # Shared TypeScript types
│   │   ├── supabase-browser.ts              # Browser Supabase client (singleton)
│   │   ├── supabase-server.ts               # Server Supabase client (per-request)
│   │   ├── csv-parser.ts                    # Parse auction invoice CSV
│   │   └── csv-export.ts                    # Build internal + Shopify CSVs
│   └── hooks/
│       ├── useItems.ts                      # Fetch + paginate items
│       └── useItemUpdate.ts                 # Autosave single item field
├── supabase/
│   └── migrations/
│       └── 001_initial.sql                  # auction_batches + items tables
└── docs/
    └── superpowers/
        ├── specs/2026-04-13-inventory-manager-design.md
        └── plans/2026-04-13-inventory-manager.md
```

---

## Task 1: GitHub Repo + Next.js Scaffold

**Files:**
- Create: all scaffold files (package.json, tsconfig.json, next.config.ts, tailwind.config.ts, .gitignore, .env.example)

- [ ] **Step 1: Authenticate GitHub CLI**

```bash
gh auth status
```
If not authenticated: `gh auth login` (interactive — user must complete this).

- [ ] **Step 2: Scaffold Next.js project**

```bash
cd C:/Users/hikma/FileHub/projects
npx create-next-app@latest inventory-manager \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*" \
  --no-turbopack
cd inventory-manager
```

- [ ] **Step 3: Install dependencies**

```bash
npm install @supabase/supabase-js @supabase/ssr papaparse
npm install -D @types/papaparse jest jest-environment-jsdom ts-jest @testing-library/react @testing-library/user-event @testing-library/jest-dom
```

- [ ] **Step 4: Create jest.config.ts**

```typescript
// jest.config.ts
import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterFramework: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: { jsx: 'react-jsx' } }],
  },
};

export default config;
```

- [ ] **Step 5: Create jest.setup.ts**

```typescript
// jest.setup.ts
import '@testing-library/jest-dom';
```

- [ ] **Step 6: Create .env.example**

```bash
# .env.example
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

- [ ] **Step 7: Update .gitignore to include .env.local and superpowers dir**

Add these lines to the existing .gitignore:
```
.env.local
.superpowers/
```

- [ ] **Step 8: Create the GitHub repo and push**

```bash
gh repo create inventory-manager --public --description "Liquidation store inventory manager — auction CSV import, dad reviews on phone, Shopify CSV export" --confirm
git remote add origin https://github.com/$(gh api user --jq .login)/inventory-manager.git
git add .
git commit -m "chore: scaffold Next.js 14 project with TypeScript and Tailwind"
git branch -M main
git push -u origin main
```

---

## Task 2: Supabase Schema

**Files:**
- Create: `supabase/migrations/001_initial.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- supabase/migrations/001_initial.sql

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE auction_batches (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  imported_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  batch_id uuid NOT NULL REFERENCES auction_batches(id) ON DELETE CASCADE,
  sku text NOT NULL,
  link text,
  title text NOT NULL,
  thumbnail_url text,
  image_count integer,
  description text,
  date_bought date,
  cost numeric,
  company_name text,
  location_bought text,
  auction_date date,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'have_it', 'dont_have', 'broken', 'partial')),
  qty_good integer,
  qty_broken integer,
  qty_sold integer NOT NULL DEFAULT 0,
  shelf_location text,
  notes text,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX items_batch_id_idx ON items(batch_id);
CREATE INDEX items_status_idx ON items(status);
CREATE INDEX items_title_search_idx ON items USING gin(to_tsvector('english', title));
```

- [ ] **Step 2: Apply schema in Supabase dashboard**

Go to your Supabase project → SQL Editor → paste the migration SQL → Run.

- [ ] **Step 3: Create .env.local with real credentials**

```bash
# .env.local (never commit this)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

- [ ] **Step 4: Commit migration file**

```bash
git add supabase/migrations/001_initial.sql .env.example
git commit -m "feat: add Supabase schema for auction_batches and items"
git push
```

---

## Task 3: TypeScript Types + Supabase Clients

**Files:**
- Create: `src/lib/types.ts`
- Create: `src/lib/supabase-browser.ts`
- Create: `src/lib/supabase-server.ts`

- [ ] **Step 1: Create types.ts**

```typescript
// src/lib/types.ts

export type ItemStatus = 'pending' | 'have_it' | 'dont_have' | 'broken' | 'partial';

export interface AuctionBatch {
  id: string;
  name: string;
  imported_at: string;
  item_count: number;
  reviewed_count: number;
}

export interface Item {
  id: string;
  batch_id: string;
  sku: string;
  link: string | null;
  title: string;
  thumbnail_url: string | null;
  image_count: number | null;
  description: string | null;
  date_bought: string | null;
  cost: number | null;
  company_name: string | null;
  location_bought: string | null;
  auction_date: string | null;
  status: ItemStatus;
  qty_good: number | null;
  qty_broken: number | null;
  qty_sold: number;
  shelf_location: string | null;
  notes: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface ItemUpdate {
  status?: ItemStatus;
  qty_good?: number | null;
  qty_broken?: number | null;
  qty_sold?: number;
  shelf_location?: string | null;
  notes?: string | null;
  reviewed_at?: string;
}

export interface ParsedCSVRow {
  sku: string;
  link: string | null;
  title: string;
  thumbnail_url: string | null;
  image_count: number | null;
  description: string | null;
  date_bought: string | null;
  cost: number | null;
  company_name: string | null;
  location_bought: string | null;
  auction_date: string | null;
  shelf_location: string | null;
}

export interface CSVParseResult {
  rows: ParsedCSVRow[];
  errors: { row: number; message: string }[];
  duplicateSKUs: string[];
}

export interface ItemsQueryResult {
  items: Item[];
  total: number;
  page: number;
  pageSize: number;
}
```

- [ ] **Step 2: Create supabase-browser.ts**

```typescript
// src/lib/supabase-browser.ts
import { createBrowserClient } from '@supabase/ssr';

let client: ReturnType<typeof createBrowserClient> | null = null;

export function getSupabaseBrowser() {
  if (!client) {
    client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return client;
}
```

- [ ] **Step 3: Create supabase-server.ts**

```typescript
// src/lib/supabase-server.ts
import { createClient } from '@supabase/supabase-js';

export function getSupabaseServer() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/types.ts src/lib/supabase-browser.ts src/lib/supabase-server.ts
git commit -m "feat: add shared types and Supabase client helpers"
git push
```

---

## Task 4: CSV Parser (TDD)

**Files:**
- Create: `src/lib/csv-parser.ts`
- Create: `src/__tests__/csv-parser.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// src/__tests__/csv-parser.test.ts
import { parseAuctionCSV } from '@/lib/csv-parser';

const VALID_CSV = `sku,title,link,thumbnail link,image count,description,date bought,cost,company name,location bought,auction date,in stock,location
LQ-001,Power Drill Set,https://example.com/1,https://img.com/1.jpg,5,18V drill kit,2025-04-01,24.00,BidSpotter,Dallas TX,2025-03-28,yes,Shelf B2
LQ-002,Air Compressor,https://example.com/2,https://img.com/2.jpg,3,20-gal compressor,2025-04-01,85.00,BidSpotter,Dallas TX,2025-03-28,,`;

const MISSING_TITLE_CSV = `sku,link
LQ-001,https://example.com`;

const EMPTY_CSV = ``;

const DUPLICATE_SKU_CSV = `sku,title
LQ-001,Power Drill
LQ-001,Power Drill Pro`;

describe('parseAuctionCSV', () => {
  it('parses a valid CSV into rows', () => {
    const result = parseAuctionCSV(VALID_CSV);
    expect(result.errors.filter(e => e.row === 0)).toHaveLength(0);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0].sku).toBe('LQ-001');
    expect(result.rows[0].title).toBe('Power Drill Set');
    expect(result.rows[0].cost).toBe(24.00);
    expect(result.rows[0].image_count).toBe(5);
    expect(result.rows[0].thumbnail_url).toBe('https://img.com/1.jpg');
    expect(result.rows[0].shelf_location).toBe('Shelf B2');
  });

  it('returns a blocking error when title column is missing', () => {
    const result = parseAuctionCSV(MISSING_TITLE_CSV);
    expect(result.rows).toHaveLength(0);
    expect(result.errors[0].row).toBe(0);
    expect(result.errors[0].message).toMatch(/title/i);
  });

  it('returns a blocking error for empty CSV', () => {
    const result = parseAuctionCSV(EMPTY_CSV);
    expect(result.rows).toHaveLength(0);
    expect(result.errors[0].row).toBe(0);
  });

  it('detects duplicate SKUs within the same upload', () => {
    const result = parseAuctionCSV(DUPLICATE_SKU_CSV);
    expect(result.duplicateSKUs).toContain('LQ-001');
  });

  it('sets null for empty optional fields', () => {
    const result = parseAuctionCSV(VALID_CSV);
    expect(result.rows[1].shelf_location).toBeNull();
  });

  it('strips dollar signs from cost field', () => {
    const csv = `sku,title,cost\nLQ-001,Drill,$24.99`;
    const result = parseAuctionCSV(csv);
    expect(result.rows[0].cost).toBe(24.99);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest src/__tests__/csv-parser.test.ts --no-coverage
```
Expected: FAIL — `Cannot find module '@/lib/csv-parser'`

- [ ] **Step 3: Implement csv-parser.ts**

```typescript
// src/lib/csv-parser.ts
import Papa from 'papaparse';
import { ParsedCSVRow, CSVParseResult } from './types';

const COLUMN_MAP: Record<string, keyof ParsedCSVRow> = {
  'sku': 'sku',
  'sku numbers': 'sku',
  'link': 'link',
  'title': 'title',
  'thumbnail link': 'thumbnail_url',
  'thumbnail_link': 'thumbnail_url',
  'thumbnail_url': 'thumbnail_url',
  'image count': 'image_count',
  'image_count': 'image_count',
  'description': 'description',
  'date bought': 'date_bought',
  'date_bought': 'date_bought',
  'cost': 'cost',
  'company name': 'company_name',
  'company_name': 'company_name',
  'location bought': 'location_bought',
  'location_bought': 'location_bought',
  'auction date': 'auction_date',
  'auction_date': 'auction_date',
  'location': 'shelf_location',
  'shelf_location': 'shelf_location',
};

const REQUIRED_MAPPED: (keyof ParsedCSVRow)[] = ['sku', 'title'];

export function parseAuctionCSV(csvText: string): CSVParseResult {
  if (!csvText.trim()) {
    return { rows: [], errors: [{ row: 0, message: 'CSV is empty' }], duplicateSKUs: [] };
  }

  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
  });

  if (!parsed.data.length) {
    return { rows: [], errors: [{ row: 0, message: 'CSV has no data rows' }], duplicateSKUs: [] };
  }

  const rawHeaders = Object.keys(parsed.data[0]);
  const mappedHeaders = new Set(rawHeaders.map(h => COLUMN_MAP[h.toLowerCase()]).filter(Boolean));
  const missingRequired = REQUIRED_MAPPED.filter(col => !mappedHeaders.has(col));

  if (missingRequired.length > 0) {
    return {
      rows: [],
      errors: [{ row: 0, message: `Missing required columns: ${missingRequired.join(', ')}` }],
      duplicateSKUs: [],
    };
  }

  const rows: ParsedCSVRow[] = [];
  const errors: { row: number; message: string }[] = [];
  const skuCounts: Record<string, number> = {};

  parsed.data.forEach((raw, i) => {
    const rowNum = i + 2;
    const mapped: Partial<ParsedCSVRow> = {};

    for (const [header, value] of Object.entries(raw)) {
      const field = COLUMN_MAP[header.toLowerCase()];
      if (!field) continue;
      const trimmed = value?.trim() || null;
      if (field === 'image_count') {
        mapped.image_count = trimmed ? parseInt(trimmed, 10) || null : null;
      } else if (field === 'cost') {
        mapped.cost = trimmed ? parseFloat(trimmed.replace(/[$,]/g, '')) || null : null;
      } else {
        (mapped as Record<string, unknown>)[field] = trimmed;
      }
    }

    if (!mapped.sku || !mapped.title) {
      errors.push({ row: rowNum, message: 'Missing SKU or title — row skipped' });
      return;
    }

    skuCounts[mapped.sku] = (skuCounts[mapped.sku] || 0) + 1;
    rows.push(mapped as ParsedCSVRow);
  });

  const duplicateSKUs = Object.entries(skuCounts)
    .filter(([, count]) => count > 1)
    .map(([sku]) => sku);

  return { rows, errors, duplicateSKUs };
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx jest src/__tests__/csv-parser.test.ts --no-coverage
```
Expected: PASS — 6 tests passing.

- [ ] **Step 5: Commit**

```bash
git add src/lib/csv-parser.ts src/__tests__/csv-parser.test.ts
git commit -m "feat: add CSV parser with column mapping and duplicate SKU detection"
git push
```

---

## Task 5: CSV Export Builder (TDD)

**Files:**
- Create: `src/lib/csv-export.ts`
- Create: `src/__tests__/csv-export.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// src/__tests__/csv-export.test.ts
import { buildInternalCSV, buildShopifyCSV } from '@/lib/csv-export';
import { Item } from '@/lib/types';

const makeItem = (overrides: Partial<Item> = {}): Item => ({
  id: 'uuid-1',
  batch_id: 'batch-1',
  sku: 'LQ-001',
  link: 'https://example.com/item',
  title: 'Power Drill Set',
  thumbnail_url: 'https://img.com/drill.jpg',
  image_count: 5,
  description: '18V cordless drill kit',
  date_bought: '2025-04-01',
  cost: 24.00,
  company_name: 'BidSpotter',
  location_bought: 'Dallas TX',
  auction_date: '2025-03-28',
  status: 'have_it',
  qty_good: 3,
  qty_broken: 0,
  qty_sold: 1,
  shelf_location: 'Shelf B2',
  notes: null,
  reviewed_at: '2025-04-10T12:00:00Z',
  created_at: '2025-04-01T00:00:00Z',
  ...overrides,
});

describe('buildInternalCSV', () => {
  it('includes have_it items', () => {
    const csv = buildInternalCSV([makeItem()]);
    expect(csv).toContain('LQ-001');
    expect(csv).toContain('Power Drill Set');
  });

  it('includes broken items', () => {
    const csv = buildInternalCSV([makeItem({ status: 'broken' })]);
    expect(csv).toContain('LQ-001');
  });

  it('includes partial items', () => {
    const csv = buildInternalCSV([makeItem({ status: 'partial' })]);
    expect(csv).toContain('LQ-001');
  });

  it('excludes dont_have items', () => {
    const csv = buildInternalCSV([makeItem({ status: 'dont_have' })]);
    expect(csv).not.toContain('LQ-001');
  });

  it('excludes pending items', () => {
    const csv = buildInternalCSV([makeItem({ status: 'pending' })]);
    expect(csv).not.toContain('LQ-001');
  });

  it('includes all expected columns', () => {
    const csv = buildInternalCSV([makeItem()]);
    expect(csv).toContain('Qty Good');
    expect(csv).toContain('Qty Broken');
    expect(csv).toContain('Qty Sold');
    expect(csv).toContain('Shelf Location');
  });
});

describe('buildShopifyCSV', () => {
  it('maps title to Handle (slugified) and Title', () => {
    const csv = buildShopifyCSV([makeItem()]);
    expect(csv).toContain('power-drill-set');
    expect(csv).toContain('Power Drill Set');
  });

  it('sets Variant Inventory Qty to qty_good minus qty_sold', () => {
    const csv = buildShopifyCSV([makeItem({ qty_good: 3, qty_sold: 1 })]);
    expect(csv).toContain('2'); // 3 - 1
  });

  it('clamps inventory qty to 0 when sold exceeds good', () => {
    const csv = buildShopifyCSV([makeItem({ qty_good: 1, qty_sold: 3 })]);
    // Should be 0, not -2
    const lines = csv.split('\n');
    const dataLine = lines[1];
    const fields = dataLine.split(',');
    const invQtyIdx = lines[0].split(',').findIndex(h => h.includes('Inventory Qty'));
    expect(parseInt(fields[invQtyIdx])).toBe(0);
  });

  it('leaves Price column blank', () => {
    const csv = buildShopifyCSV([makeItem()]);
    const headers = csv.split('\n')[0];
    expect(headers).toContain('Variant Price');
    const dataRow = csv.split('\n')[1].split(',');
    const priceIdx = headers.split(',').findIndex(h => h.includes('Variant Price'));
    expect(dataRow[priceIdx]).toBe('');
  });

  it('excludes dont_have and pending items', () => {
    const items = [
      makeItem({ sku: 'LQ-001', status: 'dont_have' }),
      makeItem({ sku: 'LQ-002', status: 'pending' }),
    ];
    const csv = buildShopifyCSV(items);
    expect(csv).not.toContain('LQ-001');
    expect(csv).not.toContain('LQ-002');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest src/__tests__/csv-export.test.ts --no-coverage
```
Expected: FAIL — `Cannot find module '@/lib/csv-export'`

- [ ] **Step 3: Implement csv-export.ts**

```typescript
// src/lib/csv-export.ts
import Papa from 'papaparse';
import { Item } from './types';

const EXCLUDED_STATUSES = new Set(['dont_have', 'pending']);

function filterItems(items: Item[]): Item[] {
  return items.filter(item => !EXCLUDED_STATUSES.has(item.status));
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function buildInternalCSV(items: Item[]): string {
  const rows = filterItems(items).map(item => ({
    SKU: item.sku,
    Title: item.title,
    Link: item.link ?? '',
    'Thumbnail URL': item.thumbnail_url ?? '',
    'Image Count': item.image_count ?? '',
    Description: item.description ?? '',
    'Date Bought': item.date_bought ?? '',
    Cost: item.cost ?? '',
    'Company Name': item.company_name ?? '',
    'Location Bought': item.location_bought ?? '',
    'Auction Date': item.auction_date ?? '',
    Status: item.status,
    'Qty Good': item.qty_good ?? '',
    'Qty Broken': item.qty_broken ?? '',
    'Qty Sold': item.qty_sold,
    'Shelf Location': item.shelf_location ?? '',
    Notes: item.notes ?? '',
  }));
  return Papa.unparse(rows);
}

export function buildShopifyCSV(items: Item[]): string {
  const rows = filterItems(items).map(item => ({
    Handle: slugify(item.title),
    Title: item.title,
    'Body (HTML)': item.description ?? '',
    Vendor: item.company_name ?? '',
    'Product Category': '',
    Type: '',
    Tags: '',
    Published: 'true',
    'Variant SKU': item.sku,
    'Variant Inventory Qty': Math.max(0, (item.qty_good ?? 0) - item.qty_sold),
    'Variant Price': '',
    'Image Src': item.thumbnail_url ?? '',
    'Image Alt Text': item.title,
  }));
  return Papa.unparse(rows);
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx jest src/__tests__/csv-export.test.ts --no-coverage
```
Expected: PASS — all tests green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/csv-export.ts src/__tests__/csv-export.test.ts
git commit -m "feat: add internal and Shopify CSV export builders"
git push
```

---

## Task 6: API Routes — Upload + Batches

**Files:**
- Create: `src/app/api/upload/route.ts`
- Create: `src/app/api/batches/route.ts`

- [ ] **Step 1: Create upload route**

```typescript
// src/app/api/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';
import { parseAuctionCSV } from '@/lib/csv-parser';

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  const name = ((formData.get('name') as string) || '').trim() || 'Unnamed Batch';

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  const text = await file.text();
  const { rows, errors, duplicateSKUs } = parseAuctionCSV(text);

  // Blocking error (missing required columns or empty)
  if (errors.some(e => e.row === 0)) {
    return NextResponse.json({ error: errors[0].message, errors }, { status: 422 });
  }

  if (rows.length === 0) {
    return NextResponse.json({ error: 'No valid rows found in CSV' }, { status: 422 });
  }

  const supabase = getSupabaseServer();

  const { data: batch, error: batchError } = await supabase
    .from('auction_batches')
    .insert({ name })
    .select()
    .single();

  if (batchError || !batch) {
    return NextResponse.json({ error: 'Failed to create batch' }, { status: 500 });
  }

  const itemsToInsert = rows.map(row => ({
    ...row,
    batch_id: batch.id,
    status: 'pending',
    qty_sold: 0,
  }));

  const { error: itemsError } = await supabase
    .from('items')
    .insert(itemsToInsert);

  if (itemsError) {
    await supabase.from('auction_batches').delete().eq('id', batch.id);
    return NextResponse.json({ error: 'Failed to insert items' }, { status: 500 });
  }

  return NextResponse.json({
    batch,
    imported: rows.length,
    skipped: errors.filter(e => e.row > 0).length,
    errors: errors.filter(e => e.row > 0),
    duplicateSKUs,
  });
}
```

- [ ] **Step 2: Create batches route**

```typescript
// src/app/api/batches/route.ts
import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';

export async function GET() {
  const supabase = getSupabaseServer();

  const { data: batches, error } = await supabase
    .from('auction_batches')
    .select('id, name, imported_at')
    .order('imported_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const enriched = await Promise.all((batches ?? []).map(async (batch) => {
    const [{ count: total }, { count: reviewed }] = await Promise.all([
      supabase.from('items').select('*', { count: 'exact', head: true }).eq('batch_id', batch.id),
      supabase.from('items').select('*', { count: 'exact', head: true })
        .eq('batch_id', batch.id).neq('status', 'pending'),
    ]);

    return {
      id: batch.id,
      name: batch.name,
      imported_at: batch.imported_at,
      item_count: total ?? 0,
      reviewed_count: reviewed ?? 0,
    };
  }));

  return NextResponse.json(enriched);
}
```

- [ ] **Step 3: Verify manually**

```bash
npm run dev
# In another terminal:
curl -X POST http://localhost:3000/api/batches
# Expected: [] (empty array)
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/upload/route.ts src/app/api/batches/route.ts
git commit -m "feat: add upload and batches API routes"
git push
```

---

## Task 7: API Routes — Items (List + Update)

**Files:**
- Create: `src/app/api/items/route.ts`
- Create: `src/app/api/items/[id]/route.ts`

- [ ] **Step 1: Create items list route (GET)**

```typescript
// src/app/api/items/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const batchId = searchParams.get('batchId');
  const search = searchParams.get('search') ?? '';
  const status = searchParams.get('status') ?? 'all';
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const pageSize = 50;

  if (!batchId) {
    return NextResponse.json({ error: 'batchId is required' }, { status: 400 });
  }

  const supabase = getSupabaseServer();
  let query = supabase.from('items').select('*', { count: 'exact' }).eq('batch_id', batchId);

  if (status !== 'all') query = query.eq('status', status);
  if (search) query = query.or(`title.ilike.%${search}%,sku.ilike.%${search}%`);

  const from = (page - 1) * pageSize;
  query = query.range(from, from + pageSize - 1).order('created_at', { ascending: true });

  const { data, count, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    items: data ?? [],
    total: count ?? 0,
    page,
    pageSize,
  });
}
```

- [ ] **Step 2: Create item update route (PATCH)**

```typescript
// src/app/api/items/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';
import { ItemUpdate } from '@/lib/types';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body: ItemUpdate = await req.json();
  const supabase = getSupabaseServer();

  // Always set reviewed_at when an item is updated
  const update: ItemUpdate = {
    ...body,
    reviewed_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('items')
    .update(update)
    .eq('id', params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Item not found' }, { status: 404 });

  return NextResponse.json(data);
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/items/route.ts "src/app/api/items/[id]/route.ts"
git commit -m "feat: add items list and item update API routes"
git push
```

---

## Task 8: API Routes — Export

**Files:**
- Create: `src/app/api/export/[batchId]/internal/route.ts`
- Create: `src/app/api/export/[batchId]/shopify/route.ts`

- [ ] **Step 1: Create internal export route**

```typescript
// src/app/api/export/[batchId]/internal/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';
import { buildInternalCSV } from '@/lib/csv-export';

export async function GET(
  _req: NextRequest,
  { params }: { params: { batchId: string } }
) {
  const supabase = getSupabaseServer();

  const { data: batch } = await supabase
    .from('auction_batches')
    .select('name')
    .eq('id', params.batchId)
    .single();

  const { data: items, error } = await supabase
    .from('items')
    .select('*')
    .eq('batch_id', params.batchId)
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const csv = buildInternalCSV(items ?? []);
  const filename = `${batch?.name ?? 'inventory'}-internal.csv`
    .replace(/[^a-z0-9\-_.]/gi, '_');

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
```

- [ ] **Step 2: Create Shopify export route**

```typescript
// src/app/api/export/[batchId]/shopify/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';
import { buildShopifyCSV } from '@/lib/csv-export';

export async function GET(
  _req: NextRequest,
  { params }: { params: { batchId: string } }
) {
  const supabase = getSupabaseServer();

  const { data: batch } = await supabase
    .from('auction_batches')
    .select('name')
    .eq('id', params.batchId)
    .single();

  const { data: items, error } = await supabase
    .from('items')
    .select('*')
    .eq('batch_id', params.batchId)
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const csv = buildShopifyCSV(items ?? []);
  const filename = `${batch?.name ?? 'inventory'}-shopify.csv`
    .replace(/[^a-z0-9\-_.]/gi, '_');

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
```

- [ ] **Step 3: Commit**

```bash
git add "src/app/api/export/[batchId]/internal/route.ts" "src/app/api/export/[batchId]/shopify/route.ts"
git commit -m "feat: add internal and Shopify CSV export API routes"
git push
```

---

## Task 9: Upload Screen UI

**Files:**
- Modify: `src/app/page.tsx`
- Create: `src/components/upload/UploadZone.tsx`
- Create: `src/components/upload/BatchList.tsx`

- [ ] **Step 1: Create UploadZone component**

```tsx
// src/components/upload/UploadZone.tsx
'use client';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

export default function UploadZone() {
  const [dragging, setDragging] = useState(false);
  const [batchName, setBatchName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ imported: number; skipped: number; duplicateSKUs: string[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function uploadFile(file: File) {
    setLoading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', batchName || file.name.replace('.csv', ''));

    const res = await fetch('/api/upload', { method: 'POST', body: formData });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? 'Upload failed');
      setLoading(false);
      return;
    }

    setResult({ imported: data.imported, skipped: data.skipped, duplicateSKUs: data.duplicateSKUs });
    setLoading(false);
    router.refresh();
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file?.name.endsWith('.csv')) uploadFile(file);
  }

  return (
    <div className="space-y-4">
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors
          ${dragging ? 'border-blue-400 bg-blue-950' : 'border-gray-600 hover:border-gray-400'}`}
        onClick={() => fileRef.current?.click()}
      >
        <div className="text-4xl mb-3">📁</div>
        <p className="text-gray-400 mb-4">Drop your auction CSV here or click to browse</p>
        <input
          ref={fileRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) uploadFile(f); }}
        />
        <button
          type="button"
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm"
          onClick={e => { e.stopPropagation(); fileRef.current?.click(); }}
        >
          Choose File
        </button>
      </div>

      <div className="flex items-center gap-3">
        <label className="text-sm text-gray-400 whitespace-nowrap">Batch name:</label>
        <input
          type="text"
          value={batchName}
          onChange={e => setBatchName(e.target.value)}
          placeholder="e.g. April Auction - BidSpotter"
          className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
        />
      </div>

      {loading && <p className="text-blue-400 text-sm">Importing...</p>}

      {error && (
        <div className="bg-red-950 border border-red-700 rounded-lg p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {result && (
        <div className="bg-green-950 border border-green-700 rounded-lg p-3 text-sm text-green-300 space-y-1">
          <p>✓ Imported {result.imported} items{result.skipped > 0 ? `, ${result.skipped} skipped` : ''}</p>
          {result.duplicateSKUs.length > 0 && (
            <p className="text-yellow-300">⚠ Duplicate SKUs in this batch: {result.duplicateSKUs.join(', ')}</p>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create BatchList component**

```tsx
// src/components/upload/BatchList.tsx
'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AuctionBatch } from '@/lib/types';

export default function BatchList() {
  const [batches, setBatches] = useState<AuctionBatch[]>([]);

  useEffect(() => {
    fetch('/api/batches').then(r => r.json()).then(setBatches);
  }, []);

  if (!batches.length) return null;

  return (
    <div className="space-y-2">
      <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wide">Previous Uploads</h2>
      {batches.map(batch => (
        <div key={batch.id} className="bg-gray-800 rounded-lg px-4 py-3 flex items-center justify-between">
          <div>
            <p className="font-medium text-sm">{batch.name}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {batch.reviewed_count} / {batch.item_count} reviewed ·{' '}
              {new Date(batch.imported_at).toLocaleDateString()}
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href={`/review/${batch.id}`}
              className="px-3 py-1.5 bg-blue-700 hover:bg-blue-600 rounded-lg text-xs font-medium"
            >
              Review
            </Link>
            <Link
              href={`/export/${batch.id}`}
              className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-xs font-medium"
            >
              Export
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Build the Upload page**

```tsx
// src/app/page.tsx
import UploadZone from '@/components/upload/UploadZone';
import BatchList from '@/components/upload/BatchList';

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-2xl mx-auto px-4 py-12 space-y-10">
        <div>
          <h1 className="text-2xl font-bold">Inventory Manager</h1>
          <p className="text-gray-400 mt-1 text-sm">Upload an auction invoice CSV to get started</p>
        </div>
        <UploadZone />
        <BatchList />
      </div>
    </main>
  );
}
```

- [ ] **Step 4: Update root layout**

```tsx
// src/app/layout.tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Inventory Manager',
  description: 'Liquidation store inventory tracker',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-gray-900 text-white`}>{children}</body>
    </html>
  );
}
```

- [ ] **Step 5: Test upload manually**

```bash
npm run dev
# Open http://localhost:3000
# Upload a test CSV and verify batch appears in list
```

- [ ] **Step 6: Commit**

```bash
git add src/app/page.tsx src/app/layout.tsx src/components/upload/
git commit -m "feat: add upload screen with drag-and-drop and batch list"
git push
```

---

## Task 10: Client Hooks — useItems + useItemUpdate

**Files:**
- Create: `src/hooks/useItems.ts`
- Create: `src/hooks/useItemUpdate.ts`

- [ ] **Step 1: Create useItems hook**

```typescript
// src/hooks/useItems.ts
'use client';
import { useState, useEffect, useCallback } from 'react';
import { Item, ItemStatus, ItemsQueryResult } from '@/lib/types';

interface UseItemsOptions {
  batchId: string;
  search: string;
  status: ItemStatus | 'all';
  page: number;
}

export function useItems({ batchId, search, status, page }: UseItemsOptions) {
  const [data, setData] = useState<ItemsQueryResult | null>(null);
  const [loading, setLoading] = useState(true);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ batchId, page: String(page), status });
    if (search) params.set('search', search);
    const res = await fetch(`/api/items?${params}`);
    if (res.ok) setData(await res.json());
    setLoading(false);
  }, [batchId, search, status, page]);

  useEffect(() => { fetch_(); }, [fetch_]);

  return { data, loading, refetch: fetch_ };
}
```

- [ ] **Step 2: Create useItemUpdate hook**

```typescript
// src/hooks/useItemUpdate.ts
'use client';
import { useCallback, useRef } from 'react';
import { Item, ItemUpdate } from '@/lib/types';

export function useItemUpdate(onSuccess?: (item: Item) => void) {
  const inFlight = useRef<Set<string>>(new Set());

  const updateItem = useCallback(async (id: string, update: ItemUpdate) => {
    if (inFlight.current.has(id)) return;
    inFlight.current.add(id);

    try {
      const res = await fetch(`/api/items/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(update),
      });
      if (res.ok) {
        const item: Item = await res.json();
        onSuccess?.(item);
      }
    } finally {
      inFlight.current.delete(id);
    }
  }, [onSuccess]);

  return { updateItem };
}
```

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useItems.ts src/hooks/useItemUpdate.ts
git commit -m "feat: add useItems and useItemUpdate client hooks"
git push
```

---

## Task 11: Review Screen — ItemDetail (Shared Form)

**Files:**
- Create: `src/components/review/ItemDetail.tsx`

- [ ] **Step 1: Create ItemDetail component**

```tsx
// src/components/review/ItemDetail.tsx
'use client';
import { useState, useEffect } from 'react';
import { Item, ItemStatus, ItemUpdate } from '@/lib/types';

const STATUS_OPTIONS: { value: ItemStatus; label: string; color: string }[] = [
  { value: 'have_it',   label: '✓ Have It',    color: 'bg-green-700 hover:bg-green-600' },
  { value: 'dont_have', label: '✗ Don\'t Have', color: 'bg-gray-600 hover:bg-gray-500' },
  { value: 'broken',    label: '⚠ Broken',      color: 'bg-red-700 hover:bg-red-600'   },
  { value: 'partial',   label: '⅟ Partial',     color: 'bg-orange-700 hover:bg-orange-600' },
];

interface Props {
  item: Item;
  onUpdate: (id: string, update: ItemUpdate) => void;
}

export default function ItemDetail({ item, onUpdate }: Props) {
  const [status, setStatus] = useState<ItemStatus>(item.status);
  const [qtyGood, setQtyGood] = useState(String(item.qty_good ?? ''));
  const [qtyBroken, setQtyBroken] = useState(String(item.qty_broken ?? ''));
  const [qtySold, setQtySold] = useState(String(item.qty_sold ?? 0));
  const [location, setLocation] = useState(item.shelf_location ?? '');
  const [notes, setNotes] = useState(item.notes ?? '');
  const [imgError, setImgError] = useState(false);

  // Sync when item changes (navigating cards)
  useEffect(() => {
    setStatus(item.status);
    setQtyGood(String(item.qty_good ?? ''));
    setQtyBroken(String(item.qty_broken ?? ''));
    setQtySold(String(item.qty_sold ?? 0));
    setLocation(item.shelf_location ?? '');
    setNotes(item.notes ?? '');
    setImgError(false);
  }, [item.id]);

  function handleStatusClick(s: ItemStatus) {
    setStatus(s);
    onUpdate(item.id, { status: s });
  }

  function handleBlur(field: keyof ItemUpdate, value: string | number | null) {
    onUpdate(item.id, { [field]: value });
  }

  return (
    <div className="space-y-4">
      {/* Thumbnail */}
      <div className="w-full aspect-video bg-gray-800 rounded-lg overflow-hidden flex items-center justify-center">
        {item.thumbnail_url && !imgError ? (
          <img
            src={item.thumbnail_url}
            alt={item.title}
            className="w-full h-full object-contain"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="text-center text-gray-500">
            <div className="text-3xl mb-1">🖼</div>
            <p className="text-xs">{item.sku}</p>
          </div>
        )}
      </div>

      {/* Item info */}
      <div>
        <h2 className="font-semibold text-base leading-snug">{item.title}</h2>
        <div className="text-xs text-gray-400 mt-1 space-x-3">
          <span>SKU: {item.sku}</span>
          {item.cost && <span>Cost: ${item.cost}</span>}
          {item.company_name && <span>{item.company_name}</span>}
        </div>
        {item.link && (
          <a
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-400 hover:underline mt-1 block"
          >
            View original listing ↗
          </a>
        )}
        {item.description && (
          <p className="text-xs text-gray-400 mt-2 line-clamp-3">{item.description}</p>
        )}
      </div>

      {/* Status buttons */}
      <div className="grid grid-cols-2 gap-2">
        {STATUS_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => handleStatusClick(opt.value)}
            className={`py-3 rounded-lg text-sm font-medium transition-colors
              ${status === opt.value ? opt.color + ' ring-2 ring-white' : 'bg-gray-700 hover:bg-gray-600'}`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Qty + location */}
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="text-xs text-gray-400 block mb-1">Qty Good</label>
          <input
            type="number"
            min="0"
            value={qtyGood}
            onChange={e => setQtyGood(e.target.value)}
            onBlur={() => handleBlur('qty_good', qtyGood === '' ? null : parseInt(qtyGood, 10))}
            className="w-full bg-gray-800 border border-gray-600 rounded-lg px-2 py-2 text-sm focus:outline-none focus:border-blue-400"
          />
        </div>
        <div>
          <label className="text-xs text-gray-400 block mb-1">Qty Broken</label>
          <input
            type="number"
            min="0"
            value={qtyBroken}
            onChange={e => setQtyBroken(e.target.value)}
            onBlur={() => handleBlur('qty_broken', qtyBroken === '' ? null : parseInt(qtyBroken, 10))}
            className="w-full bg-gray-800 border border-gray-600 rounded-lg px-2 py-2 text-sm focus:outline-none focus:border-blue-400"
          />
        </div>
        <div>
          <label className="text-xs text-gray-400 block mb-1">Qty Sold</label>
          <input
            type="number"
            min="0"
            value={qtySold}
            onChange={e => setQtySold(e.target.value)}
            onBlur={() => handleBlur('qty_sold', qtySold === '' ? 0 : parseInt(qtySold, 10))}
            className="w-full bg-gray-800 border border-gray-600 rounded-lg px-2 py-2 text-sm focus:outline-none focus:border-blue-400"
          />
        </div>
      </div>

      <div>
        <label className="text-xs text-gray-400 block mb-1">Shelf / Location</label>
        <input
          type="text"
          value={location}
          onChange={e => setLocation(e.target.value)}
          onBlur={() => handleBlur('shelf_location', location || null)}
          placeholder="e.g. Shelf B2, Back Room"
          className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
        />
      </div>

      <div>
        <label className="text-xs text-gray-400 block mb-1">Notes</label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          onBlur={() => handleBlur('notes', notes || null)}
          rows={2}
          placeholder="Any notes..."
          className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 resize-none"
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/review/ItemDetail.tsx
git commit -m "feat: add ItemDetail shared review form component"
git push
```

---

## Task 12: Review Screen — Header + SearchFilter

**Files:**
- Create: `src/components/review/ReviewHeader.tsx`
- Create: `src/components/review/SearchFilter.tsx`

- [ ] **Step 1: Create ReviewHeader**

```tsx
// src/components/review/ReviewHeader.tsx
'use client';
import Link from 'next/link';

interface Props {
  batchName: string;
  batchId: string;
  reviewed: number;
  total: number;
  view: 'card' | 'table';
  onViewChange: (v: 'card' | 'table') => void;
}

export default function ReviewHeader({ batchName, batchId, reviewed, total, view, onViewChange }: Props) {
  const pct = total > 0 ? Math.round((reviewed / total) * 100) : 0;

  return (
    <div className="sticky top-0 z-10 bg-gray-900 border-b border-gray-700 px-4 py-3">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-gray-400 hover:text-white text-sm">← Back</Link>
            <h1 className="font-semibold text-sm truncate max-w-[160px] sm:max-w-xs">{batchName}</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/export/${batchId}`}
              className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-xs"
            >
              Export
            </Link>
            <button
              onClick={() => onViewChange('table')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium ${view === 'table' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}
            >
              ☰ Table
            </button>
            <button
              onClick={() => onViewChange('card')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium ${view === 'card' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}
            >
              ⊞ Cards
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-xs text-gray-400 whitespace-nowrap">{reviewed} / {total} reviewed</span>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create SearchFilter**

```tsx
// src/components/review/SearchFilter.tsx
'use client';
import { useEffect, useState } from 'react';
import { ItemStatus } from '@/lib/types';

interface Props {
  onSearch: (q: string) => void;
  onStatus: (s: ItemStatus | 'all') => void;
  status: ItemStatus | 'all';
}

const STATUS_OPTIONS: { value: ItemStatus | 'all'; label: string }[] = [
  { value: 'all',      label: 'All' },
  { value: 'pending',  label: '⏳ Pending' },
  { value: 'have_it',  label: '✓ Have It' },
  { value: 'dont_have',label: '✗ Don\'t Have' },
  { value: 'broken',   label: '⚠ Broken' },
  { value: 'partial',  label: '⅟ Partial' },
];

export default function SearchFilter({ onSearch, onStatus, status }: Props) {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const t = setTimeout(() => onSearch(query), 300);
    return () => clearTimeout(t);
  }, [query, onSearch]);

  return (
    <div className="flex gap-2">
      <input
        type="text"
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Search title or SKU..."
        className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
      />
      <select
        value={status}
        onChange={e => onStatus(e.target.value as ItemStatus | 'all')}
        className="bg-gray-800 border border-gray-600 rounded-lg px-2 py-2 text-sm focus:outline-none focus:border-blue-400"
      >
        {STATUS_OPTIONS.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/review/ReviewHeader.tsx src/components/review/SearchFilter.tsx
git commit -m "feat: add ReviewHeader with progress bar and SearchFilter"
git push
```

---

## Task 13: Review Screen — CardView

**Files:**
- Create: `src/components/review/CardView.tsx`

- [ ] **Step 1: Create CardView**

```tsx
// src/components/review/CardView.tsx
'use client';
import { Item, ItemUpdate } from '@/lib/types';
import ItemDetail from './ItemDetail';

interface Props {
  items: Item[];
  currentIndex: number;
  total: number;
  onNavigate: (index: number) => void;
  onUpdate: (id: string, update: ItemUpdate) => void;
}

export default function CardView({ items, currentIndex, total, onNavigate, onUpdate }: Props) {
  const item = items[currentIndex];

  if (!item) return (
    <div className="flex items-center justify-center h-64 text-gray-500">
      No items to review
    </div>
  );

  return (
    <div className="space-y-4">
      <ItemDetail item={item} onUpdate={onUpdate} />

      <div className="flex items-center justify-between pt-2">
        <button
          onClick={() => onNavigate(currentIndex - 1)}
          disabled={currentIndex === 0}
          className="px-5 py-2.5 bg-gray-700 hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg text-sm font-medium"
        >
          ← Prev
        </button>
        <span className="text-xs text-gray-500">{currentIndex + 1} of {total}</span>
        <button
          onClick={() => onNavigate(currentIndex + 1)}
          disabled={currentIndex >= total - 1}
          className="px-5 py-2.5 bg-blue-700 hover:bg-blue-600 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg text-sm font-medium"
        >
          Next →
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/review/CardView.tsx
git commit -m "feat: add CardView component for image-forward item review"
git push
```

---

## Task 14: Review Screen — TableView

**Files:**
- Create: `src/components/review/TableView.tsx`

- [ ] **Step 1: Create TableView**

```tsx
// src/components/review/TableView.tsx
'use client';
import { useState } from 'react';
import { Item, ItemUpdate } from '@/lib/types';
import ItemDetail from './ItemDetail';

const STATUS_BADGE: Record<string, string> = {
  pending:  'bg-gray-600 text-gray-200',
  have_it:  'bg-green-700 text-green-100',
  dont_have:'bg-gray-700 text-gray-300',
  broken:   'bg-red-700 text-red-100',
  partial:  'bg-orange-700 text-orange-100',
};

const STATUS_LABEL: Record<string, string> = {
  pending:  '⏳ Pending',
  have_it:  '✓ Have It',
  dont_have:'✗ Don\'t Have',
  broken:   '⚠ Broken',
  partial:  '⅟ Partial',
};

interface Props {
  items: Item[];
  onUpdate: (id: string, update: ItemUpdate) => void;
}

export default function TableView({ items, onUpdate }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = items.find(i => i.id === selectedId) ?? null;

  function handleUpdate(id: string, update: ItemUpdate) {
    onUpdate(id, update);
  }

  return (
    <div className="flex gap-4 h-[calc(100vh-200px)]">
      {/* Table */}
      <div className="flex-1 overflow-y-auto rounded-lg border border-gray-700">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-gray-800 text-gray-400 text-xs uppercase">
            <tr>
              <th className="text-left px-3 py-2">SKU</th>
              <th className="text-left px-3 py-2">Title</th>
              <th className="text-left px-3 py-2">Status</th>
              <th className="text-right px-3 py-2">Good</th>
              <th className="text-right px-3 py-2">Sold</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr
                key={item.id}
                onClick={() => setSelectedId(item.id === selectedId ? null : item.id)}
                className={`border-t border-gray-700 cursor-pointer transition-colors
                  ${item.id === selectedId ? 'bg-blue-950' : 'hover:bg-gray-800'}`}
              >
                <td className="px-3 py-2 text-green-400 font-mono text-xs">{item.sku}</td>
                <td className="px-3 py-2 max-w-[200px] truncate">{item.title}</td>
                <td className="px-3 py-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_BADGE[item.status]}`}>
                    {STATUS_LABEL[item.status]}
                  </span>
                </td>
                <td className="px-3 py-2 text-right text-gray-400">{item.qty_good ?? '—'}</td>
                <td className="px-3 py-2 text-right text-gray-400">{item.qty_sold}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Slide-out detail panel */}
      {selected && (
        <div className="w-80 flex-shrink-0 overflow-y-auto bg-gray-800 rounded-lg border border-gray-700 p-4">
          <button
            onClick={() => setSelectedId(null)}
            className="text-gray-400 hover:text-white text-xs mb-3"
          >
            ✕ Close
          </button>
          <ItemDetail item={selected} onUpdate={handleUpdate} />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/review/TableView.tsx
git commit -m "feat: add TableView with slide-out item detail panel"
git push
```

---

## Task 15: Review Page

**Files:**
- Create: `src/app/review/[batchId]/page.tsx`

- [ ] **Step 1: Create Review page**

```tsx
// src/app/review/[batchId]/page.tsx
'use client';
import { useState, useCallback, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { AuctionBatch, Item, ItemStatus, ItemUpdate } from '@/lib/types';
import { useItems } from '@/hooks/useItems';
import { useItemUpdate } from '@/hooks/useItemUpdate';
import ReviewHeader from '@/components/review/ReviewHeader';
import SearchFilter from '@/components/review/SearchFilter';
import CardView from '@/components/review/CardView';
import TableView from '@/components/review/TableView';

export default function ReviewPage() {
  const { batchId } = useParams<{ batchId: string }>();
  const [view, setView] = useState<'card' | 'table'>('card');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<ItemStatus | 'all'>('pending');
  const [page] = useState(1);
  const [cardIndex, setCardIndex] = useState(0);
  const [localItems, setLocalItems] = useState<Item[]>([]);
  const [batch, setBatch] = useState<AuctionBatch | null>(null);

  // Fetch batch info for header
  useEffect(() => {
    fetch('/api/batches')
      .then(r => r.json())
      .then((batches: AuctionBatch[]) => {
        const found = batches.find(b => b.id === batchId);
        if (found) setBatch(found);
      });
  }, [batchId]);

  const { data, loading } = useItems({ batchId, search, status, page });

  // Sync items from server into local state so we can apply optimistic updates
  useEffect(() => {
    if (data && !loading) {
      setLocalItems(data.items);
      setCardIndex(0);
    }
  }, [data, loading]);

  const { updateItem } = useItemUpdate(useCallback((updated: Item) => {
    setLocalItems(prev => prev.map(i => i.id === updated.id ? updated : i));
  }, []));

  const handleSearch = useCallback((q: string) => {
    setSearch(q);
  }, []);

  const handleStatus = useCallback((s: ItemStatus | 'all') => {
    setStatus(s);
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <ReviewHeader
        batchName={batch?.name ?? '...'}
        batchId={batchId}
        reviewed={batch?.reviewed_count ?? 0}
        total={batch?.item_count ?? 0}
        view={view}
        onViewChange={setView}
      />
      <div className="max-w-4xl mx-auto px-4 py-4 space-y-4">
        <SearchFilter onSearch={handleSearch} onStatus={handleStatus} status={status} />
        {loading && <p className="text-gray-400 text-sm">Loading...</p>}
        {!loading && view === 'card' && (
          <CardView
            items={localItems}
            currentIndex={cardIndex}
            total={localItems.length}
            onNavigate={setCardIndex}
            onUpdate={updateItem}
          />
        )}
        {!loading && view === 'table' && (
          <TableView items={localItems} onUpdate={updateItem} />
        )}
        {data && data.total > 50 && (
          <p className="text-xs text-gray-500 text-center">
            Showing {localItems.length} of {data.total} items. Use search to narrow results.
          </p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Test review screen**

```bash
npm run dev
# Upload a CSV from home page, click Review, verify card and table views work
# Test: change status on an item, navigate away and back — status should persist
```

- [ ] **Step 3: Commit**

```bash
git add "src/app/review/[batchId]/page.tsx"
git commit -m "feat: add review page with card/table toggle and autosave"
git push
```

---

## Task 16: Export Screen

**Files:**
- Create: `src/components/export/ExportStats.tsx`
- Create: `src/components/export/ExportButtons.tsx`
- Create: `src/app/export/[batchId]/page.tsx`

- [ ] **Step 1: Create ExportStats**

```tsx
// src/components/export/ExportStats.tsx
interface Stats {
  total: number;
  have_it: number;
  dont_have: number;
  broken: number;
  partial: number;
  pending: number;
}

export default function ExportStats({ stats }: { stats: Stats }) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
      {[
        { label: 'Total',      value: stats.total,      color: 'text-gray-300' },
        { label: 'Have It',    value: stats.have_it,    color: 'text-green-400' },
        { label: "Don't Have", value: stats.dont_have,  color: 'text-gray-400' },
        { label: 'Broken',     value: stats.broken,     color: 'text-red-400'  },
        { label: 'Partial',    value: stats.partial,    color: 'text-orange-400'},
        { label: 'Pending',    value: stats.pending,    color: 'text-yellow-400'},
      ].map(s => (
        <div key={s.label} className="bg-gray-800 rounded-lg px-3 py-3 text-center">
          <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Create ExportButtons**

```tsx
// src/components/export/ExportButtons.tsx
'use client';

interface Props {
  batchId: string;
  exportCount: number;
}

export default function ExportButtons({ batchId, exportCount }: Props) {
  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-400">
        {exportCount} items will be exported (excludes "Don't Have" and unreviewed)
      </p>
      <div className="grid sm:grid-cols-2 gap-3">
        <a
          href={`/api/export/${batchId}/internal`}
          className="flex items-center justify-between bg-gray-700 hover:bg-gray-600 rounded-xl px-5 py-4 transition-colors"
        >
          <div>
            <p className="font-semibold text-sm">📄 Internal CSV</p>
            <p className="text-xs text-gray-400 mt-0.5">All fields · your full record</p>
          </div>
          <span className="text-gray-400 text-lg">↓</span>
        </a>
        <a
          href={`/api/export/${batchId}/shopify`}
          className="flex items-center justify-between bg-green-800 hover:bg-green-700 rounded-xl px-5 py-4 transition-colors"
        >
          <div>
            <p className="font-semibold text-sm">🛍 Shopify CSV</p>
            <p className="text-xs text-green-300 mt-0.5">Shopify columns · ready to import</p>
          </div>
          <span className="text-green-300 text-lg">↓</span>
        </a>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create Export page**

```tsx
// src/app/export/[batchId]/page.tsx
import { getSupabaseServer } from '@/lib/supabase-server';
import Link from 'next/link';
import ExportStats from '@/components/export/ExportStats';
import ExportButtons from '@/components/export/ExportButtons';
import { ItemStatus } from '@/lib/types';

export default async function ExportPage({ params }: { params: { batchId: string } }) {
  const supabase = getSupabaseServer();

  const { data: batch } = await supabase
    .from('auction_batches')
    .select('name')
    .eq('id', params.batchId)
    .single();

  const { data: items } = await supabase
    .from('items')
    .select('status')
    .eq('batch_id', params.batchId);

  const counts = (items ?? []).reduce(
    (acc, item) => {
      acc.total++;
      acc[item.status as ItemStatus]++;
      return acc;
    },
    { total: 0, have_it: 0, dont_have: 0, broken: 0, partial: 0, pending: 0 } as Record<string, number>
  );

  const exportCount = counts.have_it + counts.broken + counts.partial;

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-2xl mx-auto px-4 py-10 space-y-8">
        <div>
          <Link href="/" className="text-gray-400 hover:text-white text-sm">← Back</Link>
          <h1 className="text-xl font-bold mt-3">{batch?.name ?? 'Export'}</h1>
          <p className="text-gray-400 text-sm mt-1">Download your inventory as CSV</p>
        </div>
        <ExportStats stats={counts as any} />
        <ExportButtons batchId={params.batchId} exportCount={exportCount} />
        <div className="text-xs text-gray-500 border-t border-gray-700 pt-4">
          <p>💡 The Shopify CSV leaves the Price column blank. Fill it in before importing to Shopify.</p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Test exports end-to-end**

```bash
npm run dev
# 1. Upload a CSV
# 2. Review a few items (mark as have_it, broken, dont_have)
# 3. Go to export screen
# 4. Download both CSVs and verify contents
#    - dont_have items should NOT appear
#    - broken items SHOULD appear
#    - Shopify CSV Price column should be blank
#    - Shopify Inventory Qty = qty_good - qty_sold
```

- [ ] **Step 5: Commit**

```bash
git add src/components/export/ "src/app/export/[batchId]/page.tsx"
git commit -m "feat: add export screen with stats and CSV download buttons"
git push
```

---

## Task 17: Save Implementation Plan to Docs

- [ ] **Step 1: Create docs directory and copy plan**

```bash
mkdir -p docs/superpowers/plans
cp C:/Users/hikma/.claude/plans/graceful-yawning-russell.md docs/superpowers/plans/2026-04-13-inventory-manager.md
```

- [ ] **Step 2: Commit**

```bash
git add docs/superpowers/plans/2026-04-13-inventory-manager.md docs/superpowers/specs/
git commit -m "docs: add design spec and implementation plan"
git push
```

---

## Task 18: Deploy to Vercel

- [ ] **Step 1: Install Vercel CLI and log in**

```bash
npm install -g vercel
vercel login
```

- [ ] **Step 2: Deploy**

```bash
vercel --prod
```
When prompted:
- Set up and deploy: Y
- Which scope: your account
- Link to existing project: N
- Project name: inventory-manager
- Directory: ./
- Override settings: N

- [ ] **Step 3: Add environment variables in Vercel dashboard**

Go to Vercel → Project → Settings → Environment Variables and add:
```
NEXT_PUBLIC_SUPABASE_URL = https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = your-anon-key
SUPABASE_SERVICE_ROLE_KEY = your-service-role-key
```

- [ ] **Step 4: Redeploy with env vars**

```bash
vercel --prod
```

- [ ] **Step 5: Smoke test production**

Open the Vercel URL, upload a CSV, review a few items on mobile, export both CSVs.

- [ ] **Step 6: Commit deploy config**

```bash
git add vercel.json 2>/dev/null || true
git commit -m "chore: deploy to Vercel" --allow-empty
git push
```

---

## Verification Checklist

- [ ] Upload a 1500-row CSV — all rows import, progress visible
- [ ] Search by title and SKU — results filter correctly
- [ ] Filter by status — only matching items shown
- [ ] Toggle between card and table view — both in sync
- [ ] Mark item as `have_it`, navigate away, come back — status persists
- [ ] Broken thumbnail URL — gray placeholder with SKU shown
- [ ] Item link opens original listing in new tab
- [ ] Export internal CSV — `dont_have` and `pending` items absent
- [ ] Export Shopify CSV — Price column blank, inventory qty = `qty_good - qty_sold`
- [ ] Works on mobile (phone) in both card and table view
