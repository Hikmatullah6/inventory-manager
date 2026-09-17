/** @jest-environment node */
import ExcelJS from 'exceljs';
import { buildQuickExportWorkbook, groupItemsByStatus } from '@/lib/xlsx-export';
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
  sale_price: null,
  company_name: 'BidSpotter',
  location_bought: 'Dallas TX',
  auction_date: '2025-03-28',
  auction_date_end: null,
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

async function load(items: Item[]) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await buildQuickExportWorkbook(items));
  return workbook;
}

describe('groupItemsByStatus', () => {
  it('orders groups sellable-first and drops empty statuses', () => {
    const groups = groupItemsByStatus([
      makeItem({ status: 'pending' }),
      makeItem({ status: 'broken' }),
      makeItem({ status: 'have_it' }),
    ]);
    expect(groups.map(g => g.status)).toEqual(['have_it', 'broken', 'pending']);
  });

  it('keeps the incoming order within a group', () => {
    const groups = groupItemsByStatus([
      makeItem({ sku: 'A' }),
      makeItem({ sku: 'B', status: 'sold' }),
      makeItem({ sku: 'C' }),
    ]);
    expect(groups[0].items.map(i => i.sku)).toEqual(['A', 'C']);
  });
});

describe('buildQuickExportWorkbook', () => {
  it('writes one sheet per non-empty status, in order', async () => {
    const workbook = await load([
      makeItem({ status: 'dont_have' }),
      makeItem({ status: 'personal_use' }),
      makeItem({ status: 'have_it' }),
    ]);
    expect(workbook.worksheets.map(s => s.name)).toEqual(['Have It', 'Personal Use', "Don't Have"]);
  });

  it('writes the header and item columns', async () => {
    const sheet = (await load([makeItem({ status: 'partial' })])).worksheets[0];
    expect(sheet.getRow(1).values).toEqual([undefined, 'SKU', 'Title', 'Product Link', 'Thumbnail', 'Status']);
    const row = sheet.getRow(2);
    expect(row.getCell(1).value).toBe('LQ-001');
    expect(row.getCell(2).value).toBe('Power Drill Set');
    expect(row.getCell(5).value).toBe('Partial');
    expect(sheet.rowCount).toBe(2);
  });

  it('makes http links clickable and leaves missing or odd values plain', async () => {
    const sheet = (await load([
      makeItem({ thumbnail_url: null }),
      makeItem({ link: 'javascript:alert(1)' }),
    ])).worksheets[0];
    expect(sheet.getRow(2).getCell(3).hyperlink).toBe('https://example.com/item');
    expect(sheet.getRow(2).getCell(4).value).toBeNull();
    expect(sheet.getRow(3).getCell(3).hyperlink).toBeUndefined();
    expect(sheet.getRow(3).getCell(3).value).toBe('javascript:alert(1)');
  });

  it('still produces a sheet when there are no items', async () => {
    const workbook = await load([]);
    expect(workbook.worksheets.map(s => s.name)).toEqual(['Items']);
  });
});
