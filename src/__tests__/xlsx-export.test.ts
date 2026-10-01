/** @jest-environment node */
import ExcelJS from 'exceljs';
import Papa from 'papaparse';
import {
  auctionDateCell, buildExportWorkbook, columnLetter, EXPORT_COLUMNS,
  EXPORT_SHEET_ORDER, exportFilename, groupItemsByStatus,
} from '@/lib/xlsx-export';
import { parseAuctionCSV } from '@/lib/csv-parser';
import type { Item, ItemStatus } from '@/lib/types';

const EXPECTED_HEADERS = [
  'sku', 'title', 'description', 'condition', 'cost', 'estimated retail', 'price',
  'link', 'thumbnail link', 'date bought', 'company', 'location bought',
  'auction date', 'category', 'subcategory', 'tags', 'season', 'quantity',
];

function makeItem(over: Partial<Item> = {}): Item {
  return {
    id: 'id-' + (over.sku ?? '1'),
    batch_id: 'b1',
    sku: '100001',
    title: 'Drill Kit',
    description: null,
    condition: null,
    link: null,
    thumbnail_url: null,
    image_count: null,
    date_bought: null,
    cost: null,
    estimated_retail: null,
    price: null,
    sale_price: null,
    company_name: null,
    location_bought: null,
    auction_date: null,
    auction_date_end: null,
    category: null,
    subcategory: [],
    tags: [],
    season: null,
    quantity: null,
    status: 'have_it',
    shelf_location: null,
    notes: null,
    reviewed_at: null,
    created_at: '2026-03-05T00:00:00Z',
    ...over,
  };
}

async function load(items: Item[]) {
  const buffer = await buildExportWorkbook(items);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
  return workbook;
}

/** A sheet turned back into CSV text, the way a re-import would see it. */
function sheetToCsv(sheet: ExcelJS.Worksheet): string {
  const rows: string[][] = [];
  sheet.eachRow(row => {
    const values = row.values as ExcelJS.CellValue[];
    rows.push(EXPORT_COLUMNS.map((_, i) => {
      const cell = values[i + 1];
      if (cell == null) return '';
      if (typeof cell === 'object' && 'text' in cell) return String(cell.text);
      return String(cell);
    }));
  });
  return Papa.unparse(rows);
}

describe('columnLetter', () => {
  it.each([[1, 'A'], [18, 'R'], [26, 'Z'], [27, 'AA']])('%i -> %s', (n, letter) => {
    expect(columnLetter(n)).toBe(letter);
  });
});

describe('exportFilename', () => {
  it('sanitises the batch name and falls back when it is blank', () => {
    expect(exportFilename('March / Lot #4', 'export', 'xlsx')).toBe('March___Lot__4-export.xlsx');
    expect(exportFilename('', 'export', 'xlsx')).toBe('inventory-export.xlsx');
  });
});

describe('auctionDateCell', () => {
  it('collapses a range, passes a single date, and blanks nothing', () => {
    expect(auctionDateCell(makeItem({ auction_date: '2026-02-28', auction_date_end: '2026-03-03' })))
      .toBe('2026-02-28 - 2026-03-03');
    expect(auctionDateCell(makeItem({ auction_date: '2026-03-29' }))).toBe('2026-03-29');
    expect(auctionDateCell(makeItem())).toBeNull();
  });
});

describe('groupItemsByStatus', () => {
  it('orders groups by EXPORT_SHEET_ORDER and drops empty statuses', () => {
    const groups = groupItemsByStatus([
      makeItem({ sku: 'a', status: 'pending' }),
      makeItem({ sku: 'b', status: 'have_it' }),
      makeItem({ sku: 'c', status: 'broken' }),
    ]);
    expect(groups.map(g => g.status)).toEqual(['have_it', 'broken', 'pending']);
  });

  it('preserves the incoming order within a group', () => {
    const groups = groupItemsByStatus([
      makeItem({ sku: 'second' }),
      makeItem({ sku: 'first' }),
    ]);
    expect(groups[0].items.map(i => i.sku)).toEqual(['second', 'first']);
  });
});

describe('buildExportWorkbook', () => {
  it('writes the 18 import headers, lowercase and in import order', async () => {
    const workbook = await load([makeItem()]);
    const header = workbook.worksheets[0].getRow(1).values as string[];
    expect(header.slice(1)).toEqual(EXPECTED_HEADERS);
  });

  it('covers the whole header row with the autofilter', async () => {
    const workbook = await load([makeItem()]);
    // ExcelJS reads the stored filter back as a range string.
    expect(workbook.worksheets[0].autoFilter).toBe('A1:R1');
  });

  // The trio is retired; nothing should bring it back into the file.
  it('has no qty columns', () => {
    expect(EXPORT_COLUMNS.map(c => c.header).join(' ')).not.toMatch(/qty/i);
  });

  it('names one sheet per non-empty status, in order', async () => {
    const workbook = await load([
      makeItem({ sku: 'a', status: 'dont_have' }),
      makeItem({ sku: 'b', status: 'have_it' }),
      makeItem({ sku: 'c', status: 'personal_use' }),
    ]);
    expect(workbook.worksheets.map(s => s.name)).toEqual(['Have It', 'Personal Use', "Don't Have"]);
  });

  it('still produces one sheet for an empty batch', async () => {
    const workbook = await load([]);
    expect(workbook.worksheets.map(s => s.name)).toEqual(['Items']);
  });

  it('links http(s) URLs and leaves other schemes as inert text', async () => {
    const workbook = await load([makeItem({
      link: 'https://x.test/l/1',
      thumbnail_url: 'javascript:alert(1)',
    })]);
    const row = workbook.worksheets[0].getRow(2);
    expect(row.getCell(8).value).toMatchObject({ hyperlink: 'https://x.test/l/1' });
    expect(row.getCell(9).value).toBe('javascript:alert(1)');
  });

  it('writes numbers as numbers and a date as its ISO text', async () => {
    const workbook = await load([makeItem({
      cost: 42, estimated_retail: 189.99, price: 129.99, quantity: 3,
      date_bought: '2026-03-05',
    })]);
    const row = workbook.worksheets[0].getRow(2);
    expect(row.getCell(5).value).toBe(42);
    expect(row.getCell(18).value).toBe(3);
    // Not an Excel Date: that would re-render in the viewer's locale and the
    // re-import would depend on who opened the file.
    expect(row.getCell(10).value).toBe('2026-03-05');
  });
});

// Nothing in the type system ties EXPORT_COLUMNS to the parser's COLUMN_MAP.
// This is the test that holds them together.
describe('export → import round trip', () => {
  const items: Item[] = [
    makeItem({
      sku: '100001',
      title: 'Drill Kit',
      description: 'Two batteries, one charger',
      condition: 'Open box',
      cost: 42,
      estimated_retail: 189.99,
      price: 129.99,
      link: 'https://x.test/l/1',
      thumbnail_url: 'https://x.test/i/1.jpg',
      date_bought: '2026-03-05',
      company_name: 'DeWalt Returns',
      location_bought: 'Chicago IL',
      auction_date: '2026-02-28',
      auction_date_end: '2026-03-03',
      category: 'Tools',
      subcategory: ['Power Tools', 'Drills'],
      tags: ['dewalt', 'cordless'],
      season: 'Winter',
      quantity: 3,
    }),
    makeItem({ sku: '100002', title: 'Bare Thing', cost: 0, quantity: 0 }),
  ];

  it('re-parses every field to the value it was exported from', async () => {
    const workbook = await load(items);
    const { rows, errors } = parseAuctionCSV(sheetToCsv(workbook.worksheets[0]));

    expect(errors).toEqual([]);
    expect(rows).toHaveLength(2);

    expect(rows[0]).toMatchObject({
      sku: '100001',
      title: 'Drill Kit',
      description: 'Two batteries, one charger',
      condition: 'Open box',
      cost: 42,
      estimated_retail: 189.99,
      price: 129.99,
      date_bought: '2026-03-05',
      company_name: 'DeWalt Returns',
      auction_date: '2026-02-28',
      auction_date_end: '2026-03-03',
      category: 'Tools',
      subcategory: ['Power Tools', 'Drills'],
      tags: ['dewalt', 'cordless'],
      season: 'Winter',
      quantity: 3,
    });

    // Zeroes survive as zeroes, and blanks come back blank rather than as "".
    expect(rows[1].cost).toBe(0);
    expect(rows[1].quantity).toBe(0);
    expect(rows[1].condition).toBeNull();
    expect(rows[1].subcategory).toEqual([]);
  });

  it('exports every status to a sheet that re-parses', async () => {
    const all = EXPORT_SHEET_ORDER.map((status: ItemStatus, i) =>
      makeItem({ sku: `s${i}`, status }));
    const workbook = await load(all);

    expect(workbook.worksheets).toHaveLength(EXPORT_SHEET_ORDER.length);
    for (const sheet of workbook.worksheets) {
      const { rows, errors } = parseAuctionCSV(sheetToCsv(sheet));
      expect(errors).toEqual([]);
      expect(rows).toHaveLength(1);
    }
  });
});
