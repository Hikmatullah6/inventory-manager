// src/lib/csv-export.ts
import Papa from 'papaparse';
import { Item } from './types';

const EXCLUDED_STATUSES = new Set(['dont_have', 'pending', 'sold', 'personal_use']);

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
    'Auction Date': item.auction_date_end
      ? `${item.auction_date} - ${item.auction_date_end}`
      : (item.auction_date ?? ''),
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

export function buildSoldCSV(items: Item[]): string {
  const rows = items
    .filter(item => item.status === 'sold')
    .map(item => ({
      SKU: item.sku,
      Title: item.title,
      Cost: item.cost ?? '',
      'Sale Price': item.sale_price ?? '',
      'Auction Date': item.auction_date_end
        ? `${item.auction_date} - ${item.auction_date_end}`
        : (item.auction_date ?? ''),
      Notes: item.notes ?? '',
    }));
  return Papa.unparse(rows);
}

export function buildPersonalUseCSV(items: Item[]): string {
  const rows = items
    .filter(item => item.status === 'personal_use')
    .map(item => ({
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
      'Auction Date': item.auction_date_end
        ? `${item.auction_date} - ${item.auction_date_end}`
        : (item.auction_date ?? ''),
      Status: item.status,
      'Qty Good': item.qty_good ?? '',
      'Qty Broken': item.qty_broken ?? '',
      'Qty Sold': item.qty_sold,
      'Shelf Location': item.shelf_location ?? '',
      Notes: item.notes ?? '',
    }));
  return Papa.unparse(rows);
}
