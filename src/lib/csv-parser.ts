import Papa from 'papaparse';
import { ParsedCSVRow, CSVParseResult } from './types';
import { splitMulti } from './multi-value';

/**
 * Header text (normalized: BOM/CR stripped, trimmed, lowercased) -> item field.
 *
 * The import sheet has 18 columns; the aliases below them are tolerated
 * spellings so a sheet renamed by hand still imports.
 *
 * `price` maps to `price`, NOT to `cost`. The sheet carries both — what we paid
 * and what we ask — and an earlier version of this map conflated them.
 */
const COLUMN_MAP: Record<string, keyof ParsedCSVRow> = {
  // The 18 columns of the import sheet, in sheet order.
  'sku': 'sku',
  'title': 'title',
  'description': 'description',
  'condition': 'condition',
  'cost': 'cost',
  'estimated retail': 'estimated_retail',
  'price': 'price',
  'link': 'link',
  'thumbnail link': 'thumbnail_url',
  'date bought': 'date_bought',
  'company': 'company_name',
  'location bought': 'location_bought',
  'auction date': 'auction_date',
  'category': 'category',
  'subcategory': 'subcategory',
  'tags': 'tags',
  'season': 'season',
  'quantity': 'quantity',

  // Tolerated spellings of the same columns.
  'sku numbers': 'sku',
  'sku #': 'sku',
  'item #': 'sku',
  'item title': 'title',
  'item name': 'title',
  'name': 'title',
  'estimated_retail': 'estimated_retail',
  'est retail': 'estimated_retail',
  'retail': 'estimated_retail',
  'thumbnail_link': 'thumbnail_url',
  'thumbnail_url': 'thumbnail_url',
  'thumbnail': 'thumbnail_url',
  'date_bought': 'date_bought',
  'company name': 'company_name',
  'company_name': 'company_name',
  'vendor': 'company_name',
  'location_bought': 'location_bought',
  'auction_date': 'auction_date',
  'sub category': 'subcategory',
  'sub-category': 'subcategory',
  'subcategories': 'subcategory',
  'qty': 'quantity',
  'image count': 'image_count',
  'image_count': 'image_count',

  // Shelf position, which the sheet does not carry but review writes.
  'location': 'shelf_location',
  'shelf_location': 'shelf_location',
  'shelf': 'shelf_location',
};

const REQUIRED_MAPPED: (keyof ParsedCSVRow)[] = ['sku', 'title'];

/** Comma-separated cells (subcategory, tags) -> a deduped array. */
const LIST_FIELDS = new Set<keyof ParsedCSVRow>(['subcategory', 'tags']);
/** Currency cells: a leading $ and thousands separators are stripped. */
const MONEY_FIELDS = new Set<keyof ParsedCSVRow>(['cost', 'estimated_retail', 'price']);
const INT_FIELDS = new Set<keyof ParsedCSVRow>(['quantity', 'image_count']);

// Normalize a single header cell: strip BOM, carriage returns, trim, lowercase
function normalizeHeader(h: string): string {
  return h.replace(/^\uFEFF/, '').replace(/\r/g, '').trim().toLowerCase();
}

/**
 * `parseFloat(x) || null` would turn a legitimate 0 into null — wrong for a
 * free lot, and wrong for a quantity of 0.
 */
function parseNumber(value: string | null, integer: boolean): number | null {
  if (!value) return null;
  const cleaned = value.replace(/[$,]/g, '').trim();
  if (!cleaned) return null;
  const n = integer ? parseInt(cleaned, 10) : parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
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

/**
 * Parse a date field that may be a range: "1/22/2026 - 1/27/2026",
 * "2026-01-22 - 2026-01-27", "1/22/2026-1/27/2026", or a single date.
 *
 * The separator must be a *spaced* dash. Splitting on any hyphen — which this
 * used to do — breaks on ISO dates, because they contain hyphens themselves:
 * `2026-01-22` split that way yields three parts and parses to null. That made
 * the exported range (and a lone ISO date) unreadable on re-import.
 */
function parseDateRange(value: string | null): { start: string | null; end: string | null } {
  if (!value) return { start: null, end: null };
  const trimmed = value.trim();

  const spaced = trimmed.split(/\s+[-–—]\s+/);
  if (spaced.length === 2) {
    return { start: parseDate(spaced[0]), end: parseDate(spaced[1]) };
  }

  // An unspaced range is only unambiguous in slash form, where the separator
  // cannot be mistaken for part of a date.
  const slashRange = trimmed.match(
    /^(\d{1,2}\/\d{1,2}\/\d{2,4})\s*[-–—]\s*(\d{1,2}\/\d{1,2}\/\d{2,4})$/
  );
  if (slashRange) {
    return { start: parseDate(slashRange[1]), end: parseDate(slashRange[2]) };
  }

  return { start: parseDate(trimmed), end: null };
}

// Find the first row that contains at least one recognized column (sku or title).
// The sheet puts headers on row 1, but Google Sheets exports often prepend a
// title row, and this still rescues those.
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

  // Strip BOM
  const clean = csvText.replace(/^\uFEFF/, '');

  const lines = clean.split(/\r?\n/);
  const headerRowIndex = findHeaderRowIndex(lines);
  const usable = lines.slice(headerRowIndex).join('\n');

  const parsed = Papa.parse<Record<string, string>>(usable, {
    header: true,
    skipEmptyLines: true,
    transformHeader: normalizeHeader,
  });

  if (!parsed.data || parsed.data.length === 0) {
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

      if (LIST_FIELDS.has(field)) {
        // [] not null: the columns are NOT NULL DEFAULT '{}'.
        (mapped as Record<string, unknown>)[field] = splitMulti(trimmed);
      } else if (MONEY_FIELDS.has(field)) {
        (mapped as Record<string, unknown>)[field] = parseNumber(trimmed, false);
      } else if (INT_FIELDS.has(field)) {
        (mapped as Record<string, unknown>)[field] = parseNumber(trimmed, true);
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
