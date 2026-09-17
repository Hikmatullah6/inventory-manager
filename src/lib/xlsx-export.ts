// src/lib/xlsx-export.ts
//
// Quick Export: one .xlsx workbook, one sheet per status, with only the columns
// needed to find an item again — SKU, title, links and status. Server-only.
import ExcelJS from 'exceljs';
import { STATUS_SHORT } from './item-status';
import type { Item, ItemStatus } from './types';

/** Sellable first, unreviewed last. */
export const QUICK_EXPORT_ORDER: ItemStatus[] = [
  'have_it', 'partial', 'broken', 'sold', 'personal_use', 'dont_have', 'pending',
];

export function groupItemsByStatus(items: Item[]): { status: ItemStatus; items: Item[] }[] {
  return QUICK_EXPORT_ORDER
    .map(status => ({ status, items: items.filter(item => item.status === status) }))
    .filter(group => group.items.length > 0);
}

const COLUMNS: Partial<ExcelJS.Column>[] = [
  { header: 'SKU',          key: 'sku',       width: 14 },
  { header: 'Title',        key: 'title',     width: 50 },
  { header: 'Product Link', key: 'link',      width: 45 },
  { header: 'Thumbnail',    key: 'thumbnail', width: 45 },
  { header: 'Status',       key: 'status',    width: 14 },
];

/** Only http(s) URLs become clickable; anything else stays plain text. */
function linkCell(url: string | null): ExcelJS.CellValue {
  if (!url) return null;
  return /^https?:\/\//i.test(url) ? { text: url, hyperlink: url } : url;
}

function addSheet(workbook: ExcelJS.Workbook, name: string, items: Item[]) {
  const sheet = workbook.addWorksheet(name, { views: [{ state: 'frozen', ySplit: 1 }] });
  sheet.columns = COLUMNS;
  sheet.getRow(1).font = { bold: true };
  sheet.autoFilter = { from: 'A1', to: 'E1' };

  for (const item of items) {
    const row = sheet.addRow({
      sku: item.sku,
      title: item.title,
      link: linkCell(item.link),
      thumbnail: linkCell(item.thumbnail_url),
      status: STATUS_SHORT[item.status],
    });
    for (const key of ['link', 'thumbnail']) {
      const cell = row.getCell(key);
      if (cell.type === ExcelJS.ValueType.Hyperlink) {
        cell.font = { color: { argb: 'FF0563C1' }, underline: true };
      }
    }
  }
}

export async function buildQuickExportWorkbook(items: Item[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const groups = groupItemsByStatus(items);

  // A workbook with no sheets will not open in Excel.
  if (groups.length === 0) addSheet(workbook, 'Items', []);
  for (const group of groups) addSheet(workbook, STATUS_SHORT[group.status], group.items);

  return Buffer.from(await workbook.xlsx.writeBuffer());
}
