// src/lib/types.ts

export type ItemStatus = 'pending' | 'have_it' | 'dont_have' | 'broken' | 'partial' | 'sold' | 'personal_use';

export interface AuctionBatch {
  id: string;
  name: string;
  imported_at: string;
  item_count: number;
  reviewed_count: number;
  /** Whether a PIN is set. The hash itself stays server-side — a 4-digit
   *  PIN's SHA-256 is exhaustively crackable offline in milliseconds. */
  has_pin: boolean;
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
  condition: string | null;
  date_bought: string | null;
  /** What we paid. Hidden behind the eye toggle — see useCostVisible. */
  cost: number | null;
  estimated_retail: number | null;
  /** What we ask for it. Distinct from sale_price, which is what we got. */
  price: number | null;
  sale_price: number | null;
  company_name: string | null;
  location_bought: string | null;
  auction_date: string | null;
  auction_date_end: string | null;
  category: string | null;
  /** Multi-value: one comma-separated import cell, a text[] column.
   *  NOT NULL DEFAULT '{}' in Postgres, so these are never null. */
  subcategory: string[];
  tags: string[];
  season: string | null;
  /** How many the lot was meant to contain, corrected during review. */
  quantity: number | null;
  status: ItemStatus;
  shelf_location: string | null;
  notes: string | null;
  reviewed_at: string | null;
  created_at: string;
}

/**
 * The fields review may write. The server picks from this same list before
 * touching Supabase, so the client and the API cannot drift apart — and a
 * forged key in the PATCH body can't reach a column nobody meant to expose.
 */
export const EDITABLE_ITEM_FIELDS = [
  'status',
  'sale_price',
  'price',
  'estimated_retail',
  'condition',
  'season',
  'category',
  'subcategory',
  'tags',
  'quantity',
  'title',
  'description',
  'shelf_location',
  'notes',
] as const;

export type EditableItemField = (typeof EDITABLE_ITEM_FIELDS)[number];

export type ItemUpdate = Partial<Pick<Item, EditableItemField>> & {
  /** Server-set on every write; never sent by the client. */
  reviewed_at?: string | null;
};

export interface ParsedCSVRow {
  sku: string;
  title: string;
  description: string | null;
  condition: string | null;
  cost: number | null;
  estimated_retail: number | null;
  price: number | null;
  link: string | null;
  thumbnail_url: string | null;
  image_count: number | null;
  date_bought: string | null;
  company_name: string | null;
  location_bought: string | null;
  auction_date: string | null;
  auction_date_end: string | null;
  category: string | null;
  subcategory: string[];
  tags: string[];
  season: string | null;
  quantity: number | null;
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

/** Distinct values behind the filter pickers, from the item_facets() function. */
export interface ItemFacets {
  /** YYYY-MM-DD, newest first. */
  dateBought: string[];
  categories: string[];
  subcategories: string[];
  tags: string[];
  seasons: string[];
}
