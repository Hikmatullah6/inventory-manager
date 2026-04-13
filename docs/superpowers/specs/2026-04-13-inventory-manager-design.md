# Inventory Manager — Design Spec
**Date:** 2026-04-13
**Status:** Approved

---

## Context

A family-run liquidation store resells items bought at auctions. The owner (dad) is the only person who knows what was physically picked up, what's in stock, what's broken, and where things are stored. Auction invoices are tracked as CSVs listing all items that were supposed to be received.

The goal is to build a tool that lets the son upload the auction invoice CSV, have dad review each item on his phone (marking its real-world status), and then export two CSVs: one internal record and one ready for Shopify import. This bridges the gap between physical inventory knowledge and online selling.

---

## Stack

- **Frontend + API:** Next.js (React) — hosted on Vercel
- **Database:** Supabase (Postgres) — free tier, handles 1500+ items comfortably
- **Deployment:** Vercel

---

## Database Schema

### `auction_batches`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid | Primary key |
| `name` | text | e.g. "April Auction - BidSpotter" |
| `imported_at` | timestamptz | When the CSV was uploaded |

### `items`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid | Primary key |
| `batch_id` | uuid | FK → auction_batches |
| `sku` | text | Their own SKU number |
| `link` | text | Original auction listing URL |
| `title` | text | Item title |
| `thumbnail_url` | text | Thumbnail image URL |
| `image_count` | integer | Number of images |
| `description` | text | Item description |
| `date_bought` | date | Date purchased |
| `cost` | numeric | What was paid at auction |
| `company_name` | text | Auction company name |
| `location_bought` | text | Where auction took place |
| `auction_date` | date | Date of auction |
| `status` | text | `pending` / `have_it` / `dont_have` / `broken` / `partial` |
| `qty_good` | integer | Count of working units (nullable) |
| `qty_broken` | integer | Count of broken units (nullable) |
| `qty_sold` | integer | Count of units sold (nullable, defaults to 0) |
| `shelf_location` | text | Physical storage location (nullable) |
| `notes` | text | Free-text notes (nullable) |
| `reviewed_at` | timestamptz | Last time dad updated this item (nullable) |

**Notes on duplicates:** Items with different SKUs may refer to the same physical product (bought in separate auction lots). This is expected and valid — no deduplication is performed.

---

## Screens

### 1. Upload Screen (you only)
- Drag & drop or file picker for CSV upload
- Optional batch name input (e.g. "April Auction - BidSpotter")
- On submit: parse CSV, validate columns, insert rows into `items` linked to a new `auction_batches` row
- If duplicate SKUs are detected within the same upload, warn before importing
- Duplicate SKUs across different batches are allowed
- List of previous uploads with name, item count, and reviewed count
- Malformed rows (missing required columns) are skipped and listed in an error summary — import continues for valid rows

### 2. Review Screen (dad on phone)
- Defaults to **card view** (image-forward, one item at a time)
- Toggle button (top-right) switches between card view and table view
- Both views stay in sync — updates in one reflect immediately in the other
- **Card view:** large thumbnail, title, SKU, cost, tappable item link (opens original listing), 4 big status buttons (Have It / Don't Have / Broken / Partial), qty good + qty broken + qty sold inputs, shelf location input
- **Table view:** scrollable rows with SKU, title, status badge, qty good, qty sold. Click any row to open a slide-out detail panel with the same fields as the card view
- **Search bar:** filters by title or SKU (debounced, client-side for current page, server-side for full dataset)
- **Status filter:** All / Pending / Have It / Don't Have / Broken / Partial
- **Progress bar:** "X of Y reviewed" shown in header
- Autosave on every status change — no Save button needed
- Pagination: 50 items per page
- Broken thumbnail URLs show a gray placeholder with the SKU

### 3. Export Screen (you only)
- Summary stats: total / have it / don't have / broken / partial / pending counts
- **Internal CSV download:** all fields from the schema, excludes `dont_have` items, includes `have_it` + `broken` + `partial`. Unreviewed (`pending`) items are excluded.
- **Shopify CSV download:** Shopify product import format, same item filter as internal CSV. Column mapping:
  - `title` → Title & Handle (slugified)
  - `description` → Body HTML
  - `sku` → Variant SKU
  - `qty_good - qty_sold` → Variant Inventory Qty (remaining available stock)
  - `thumbnail_url` → Image Src
  - `Price` → left blank (to be filled manually before Shopify import)
  - `Vendor` → `company_name`
- Both exports can be triggered at any time, even mid-review

---

## UI/UX Principles

- **Mobile-first:** All screens designed for phone use. Touch targets ≥ 44px. Card view is the default for dad.
- **No login required (v1):** Single shared URL. Auth can be added later if needed.
- **Autosave:** Every field change persists immediately to Supabase — no lost progress if connection drops.
- **Images over text:** Thumbnails are prominent in card view. Item link is tappable for original listing.

---

## Error Handling

| Scenario | Behavior |
|---|---|
| CSV missing required columns | Block import, show which columns are missing |
| CSV rows with bad data | Skip bad rows, import rest, show skipped row list |
| Duplicate SKUs within same upload | Warn before importing, user confirms to proceed |
| Broken thumbnail URL | Gray placeholder with SKU shown |
| Network loss during review | Autosave already persisted last action — no data lost |
| Shopify Price column | Left blank in export — filled manually before Shopify import |

---

## Export Rules

- **Excluded from both exports:** `dont_have` and `pending` items
- **Included in both exports:** `have_it`, `broken`, `partial`
- **Shopify CSV:** `qty_good - qty_sold` used for inventory quantity (remaining available stock). Broken items included (store owner decides pricing and listing strategy).

---

## Out of Scope (v1)

- User authentication / login
- Multi-user roles (admin vs viewer)
- Price setting within the app
- Direct Shopify API integration (CSV upload to Shopify is manual)
- Image hosting (thumbnails link to auction source URLs)
