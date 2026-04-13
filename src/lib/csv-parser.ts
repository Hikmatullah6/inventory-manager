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
