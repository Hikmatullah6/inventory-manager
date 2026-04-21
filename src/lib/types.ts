// src/lib/types.ts

export type ItemStatus = 'pending' | 'have_it' | 'dont_have' | 'broken' | 'partial' | 'sold' | 'personal_use';

export interface AuctionBatch {
  id: string;
  name: string;
  imported_at: string;
  item_count: number;
  reviewed_count: number;
  pin_hash: string | null;
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
  sale_price: number | null;
  company_name: string | null;
  location_bought: string | null;
  auction_date: string | null;
  auction_date_end: string | null;
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
  sale_price?: number | null;
  qty_good?: number | null;
  qty_broken?: number | null;
  qty_sold?: number;
  shelf_location?: string | null;
  notes?: string | null;
  reviewed_at?: string | null;
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
  auction_date_end: string | null;
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
