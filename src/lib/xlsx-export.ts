// src/lib/xlsx-export.ts
import ExcelJS from 'exceljs';
import type { Item, ItemStatus } from './types';
import { STATUS_SHORT } from './item-status';
import { joinMulti } from './multi-value';

/** Sellable first, unreviewed last. */
export const EXPORT_SHEET_ORDER: ItemStatus[] = [
  'have_it', 'partial', 'broken', 'sold', 'personal_use', 'dont_have', 'pending',
];

export function exportFilename(batchName: string, suffix: string, extension: string): string {
  return `${batchName || 'inventory'}-${suffix}.${extension}`.replace(/[^a-z0-9\-_.]/gi, '_');
}

/** "2026-01-22 - 2026-01-27", or the single date, or blank. */
export function auctionDateCell(item: Item): string | null {
  if (item.auction_date_end) return `${item.auction_date} - ${item.auction_date_end}`;
  return item.auction_date ?? null;
}

function linkCell(url: string | null): ExcelJS.CellValue {
  if (!url) return null;
  // Only http(s) becomes clickable; a javascript: URL stays inert text.
  return /^https?:\/\//i.test(url) ? { text: url, hyperlink: url } : url;
}

interface ColumnSpec {
  header: string;
  width: number;
  /** '@' is Excel's text format. Dates are written as text on purpose — see below. */
  numFmt: string;
  value: (item: Item) => ExcelJS.CellValue;
}

/**
 * The 18 import columns, in import order, with the import's own lowercase header
 * text — so an exported sheet is a valid input file.
 *
 * Nothing in the type system ties these headers to `COLUMN_MAP` in
 * csv-parser.ts. The round-trip test is what holds them together; if you rename
 * a header here, that test is what should fail.
 *
 * Dates are written as text, not as Excel Dates: a real Date is re-rendered in
 * the viewer's locale, and the re-import would then depend on who opened the
 * file.
 */
export const EXPORT_COLUMNS: ColumnSpec[] = [
  { header: 'sku', width: 14, numFmt: '@', value: i => i.sku },
  { header: 'title', width: 48, numFmt: '@', value: i => i.title },
  { header: 'description', width: 60, numFmt: '@', value: i => i.description },
  { header: 'condition', width: 14, numFmt: '@', value: i => i.condition },
  { header: 'cost', width: 10, numFmt: '#,##0.00', value: i => i.cost },
  { header: 'estimated retail', width: 16, numFmt: '#,##0.00', value: i => i.estimated_retail },
  { header: 'price', width: 10, numFmt: '#,##0.00', value: i => i.price },
  { header: 'link', width: 45, numFmt: '@', value: i => linkCell(i.link) },
  { header: 'thumbnail link', width: 45, numFmt: '@', value: i => linkCell(i.thumbnail_url) },
  { header: 'date bought', width: 13, numFmt: '@', value: i => i.date_bought },
  { header: 'company', width: 20, numFmt: '@', value: i => i.company_name },
  { header: 'location bought', width: 18, numFmt: '@', value: i => i.location_bought },
  { header: 'auction date', width: 24, numFmt: '@', value: i => auctionDateCell(i) },
  { header: 'category', width: 18, numFmt: '@', value: i => i.category },
  { header: 'subcategory', width: 22, numFmt: '@', value: i => joinMulti(i.subcategory) },
  { header: 'tags', width: 26, numFmt: '@', value: i => joinMulti(i.tags) },
  { header: 'season', width: 12, numFmt: '@', value: i => i.season },
  { header: 'quantity', width: 10, numFmt: '0', value: i => i.quantity },
];

/** 1-based column index -> spreadsheet letter. 18 -> "R". */
export function columnLetter(index: number): string {
  let n = index;
  let out = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    out = String.fromCharCode(65 + rem) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}

export function groupItemsByStatus(items: Item[]): { status: ItemStatus; items: Item[] }[] {
  return EXPORT_SHEET_ORDER
    .map(status => ({ status, items: items.filter(item => item.status === status) }))
    .filter(group => group.items.length > 0);
}

function addSheet(workbook: ExcelJS.Workbook, name: string, items: Item[]) {
  const sheet = workbook.addWorksheet(name, { views: [{ state: 'frozen', ySplit: 1 }] });

  sheet.columns = EXPORT_COLUMNS.map(c => ({ header: c.header, width: c.width }));
  EXPORT_COLUMNS.forEach((c, i) => { sheet.getColumn(i + 1).numFmt = c.numFmt; });

  sheet.getRow(1).font = { bold: true };
  // Derived from the column count, so adding a column cannot leave the filter
  // covering only part of the header row.
  sheet.autoFilter = { from: 'A1', to: `${columnLetter(EXPORT_COLUMNS.length)}1` };

  for (const item of items) {
    const row = sheet.addRow(EXPORT_COLUMNS.map(c => c.value(item)));
    for (const i of [8, 9]) { // link, thumbnail link
      const cell = row.getCell(i);
      if (cell.type === ExcelJS.ValueType.Hyperlink) {
        cell.font = { color: { argb: 'FF0563C1' }, underline: true };
      }
    }
  }
}

/**
 * One workbook for the whole batch: the 18 import columns, one sheet per status.
 *
 * The item's status is carried by the sheet it is on, not by a column — the
 * import sheet has no status column. Re-importing a sheet therefore resets every
 * row to `pending`.
 */
export async function buildExportWorkbook(items: Item[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const groups = groupItemsByStatus(items);

  // A workbook with no sheets will not open in Excel.
  if (groups.length === 0) addSheet(workbook, 'Items', []);
  for (const group of groups) addSheet(workbook, STATUS_SHORT[group.status], group.items);

  return Buffer.from(await workbook.xlsx.writeBuffer());
}
