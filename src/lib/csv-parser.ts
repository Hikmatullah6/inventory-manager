// src/lib/csv-parser.ts
import Papa from 'papaparse';
import { ParsedCSVRow, CSVParseResult } from './types';

const COLUMN_MAP: Record<string, keyof ParsedCSVRow> = {
  'sku': 'sku',
  'sku numbers': 'sku',
  'sku #': 'sku',
  'item #': 'sku',
  'link': 'link',
  'title': 'title',
  'item title': 'title',
  'item name': 'title',
  'name': 'title',
  'thumbnail link': 'thumbnail_url',
  'thumbnail_link': 'thumbnail_url',
  'thumbnail_url': 'thumbnail_url',
  'thumbnail': 'thumbnail_url',
  'image count': 'image_count',
  'image_count': 'image_count',
  'description': 'description',
  'date bought': 'date_bought',
  'date_bought': 'date_bought',
  'cost': 'cost',
  'price': 'cost',
  'company name': 'company_name',
  'company_name': 'company_name',
  'company': 'company_name',
  'vendor': 'company_name',
  'location bought': 'location_bought',
  'location_bought': 'location_bought',
  'auction date': 'auction_date',
  'auction_date': 'auction_date',
  'location': 'shelf_location',
  'shelf_location': 'shelf_location',
  'shelf': 'shelf_location',
};

const REQUIRED_MAPPED: (keyof ParsedCSVRow)[] = ['sku', 'title'];

// Normalize a single header cell: strip BOM, carriage returns, trim, lowercase
function normalizeHeader(h: string): string {
  return h.replace(/^\uFEFF/, '').replace(/\r/g, '').trim().toLowerCase();
}

// Parse a single date string into YYYY-MM-DD format.
// Handles: "1/22/2026", "2026-01-22", empty/null.
function parseDate(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  // Already ISO format
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  // M/D/YYYY, MM/DD/YYYY, M/D/YY, or MM/DD/YY
  const match = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (match) {
    const [, m, d, rawY] = match;
    const y = rawY.length === 2 ? `20${rawY}` : rawY;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  // Unknown format — return null rather than sending a bad value to Postgres
  return null;
}

// Parse a date field that may be a range (e.g. "1/22/2026 - 1/27/2026").
// Returns start and end dates in YYYY-MM-DD format.
function parseDateRange(value: string | null): { start: string | null; end: string | null } {
  if (!value) return { start: null, end: null };
  const parts = value.split(/\s*[-–—]\s*/);
  const start = parseDate(parts[0] ?? null);
  // Only treat as a range when there are exactly two parts and the second looks like a date
  const end = parts.length === 2 ? parseDate(parts[1] ?? null) : null;
  return { start, end };
}

// Find the first row that contains at least one recognized column (sku or title).
// Google Sheets exports often have a title row before the actual headers.
function findHeaderRowIndex(lines: string[]): number {
  for (let i = 0; i < Math.min(lines.length, 10); i++) {
    const cells = lines[i].split(/,|\t/).map(normalizeHeader);
    if (cells.some(c => c === 'sku' || c === 'title' || COLUMN_MAP[c] === 'sku' || COLUMN_MAP[c] === 'title')) {
      return i;
    }
  }
  return 0; // fall back to first row
}

export function parseAuctionCSV(csvText: string): CSVParseResult {
  if (!csvText.trim()) {
    return { rows: [], errors: [{ row: 0, message: 'CSV is empty' }], duplicateSKUs: [] };
  }

  // Strip BOM from start of file
  const cleaned = csvText.replace(/^\uFEFF/, '');

  // Find which line has the real column headers
  const lines = cleaned.split(/\r?\n/);
  const headerRowIndex = findHeaderRowIndex(lines);
  // Rebuild CSV starting from the header row
  const csvFromHeader = lines.slice(headerRowIndex).join('\n');

  const parsed = Papa.parse<Record<string, string>>(csvFromHeader, {
    header: true,
    skipEmptyLines: true,
    transformHeader: normalizeHeader,
  });

  if (!parsed.data.length) {
    return { rows: [], errors: [{ row: 0, message: 'CSV has no data rows' }], duplicateSKUs: [] };
  }

  const rawHeaders = Object.keys(parsed.data[0]);
  const mappedHeaders = new Set(rawHeaders.map(h => COLUMN_MAP[h]).filter(Boolean));
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
      const field = COLUMN_MAP[header]; // already normalized by transformHeader
      if (!field) continue;
      const trimmed = value?.trim() || null;
      if (field === 'image_count') {
        mapped.image_count = trimmed ? parseInt(trimmed, 10) || null : null;
      } else if (field === 'cost') {
        mapped.cost = trimmed ? parseFloat(trimmed.replace(/[$,]/g, '')) || null : null;
      } else if (field === 'date_bought') {
        mapped.date_bought = parseDate(trimmed);
      } else if (field === 'auction_date') {
        const { start, end } = parseDateRange(trimmed);
        mapped.auction_date = start;
        mapped.auction_date_end = end;
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
