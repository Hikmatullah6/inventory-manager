import { readFileSync } from 'fs';
import path from 'path';
import { parseAuctionCSV } from '@/lib/csv-parser';

const HEADER =
  'sku,title,description,condition,cost,estimated retail,price,link,thumbnail link,' +
  'date bought,company,location bought,auction date,category,subcategory,tags,season,quantity';

function sheet(...rows: string[]) {
  return [HEADER, ...rows].join('\n');
}

describe('parseAuctionCSV', () => {
  it('maps all 18 columns of the import sheet', () => {
    const { rows, errors } = parseAuctionCSV(sheet(
      '100001,Drill Kit,Two batteries,Open box,42.00,189.99,129.99,' +
      'https://x.test/l/1,https://x.test/i/1.jpg,3/5/2026,DeWalt Returns,Chicago IL,' +
      '2/28/2026 - 3/3/2026,Tools,"Power Tools, Drills","dewalt, cordless",Winter,3'
    ));

    expect(errors.filter(e => e.row === 0)).toHaveLength(0);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual({
      sku: '100001',
      title: 'Drill Kit',
      description: 'Two batteries',
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
    });
  });

  // The regression this whole change is most likely to cause: the old COLUMN_MAP
  // mapped the header `price` onto `cost`, so the two silently collided.
  describe('cost and price are separate fields', () => {
    it('keeps both when the sheet has both', () => {
      const { rows } = parseAuctionCSV(sheet(
        '1,Thing,,,42.00,,89.99,,,,,,,,,,,'
      ));
      expect(rows[0].cost).toBe(42);
      expect(rows[0].price).toBe(89.99);
    });

    it('leaves cost null when the sheet only has price', () => {
      const { rows } = parseAuctionCSV('sku,title,price\n1,Thing,89.99');
      expect(rows[0].price).toBe(89.99);
      expect(rows[0].cost).toBeUndefined();
    });
  });

  describe('money columns', () => {
    it('strips dollar signs and thousands separators', () => {
      const { rows } = parseAuctionCSV(sheet(
        '1,Thing,,,"$1,299.00","$2,499.99",$24.99,,,,,,,,,,,'
      ));
      expect(rows[0].cost).toBe(1299);
      expect(rows[0].estimated_retail).toBe(2499.99);
      expect(rows[0].price).toBe(24.99);
    });

    // `parseFloat(x) || null` used to turn a free lot into "unknown".
    it('keeps a zero as zero', () => {
      const { rows } = parseAuctionCSV(sheet('1,Thing,,,0,,0.00,,,,,,,,,,,0'));
      expect(rows[0].cost).toBe(0);
      expect(rows[0].price).toBe(0);
      expect(rows[0].quantity).toBe(0);
    });

    it('nulls a blank or unparseable amount', () => {
      const { rows } = parseAuctionCSV(sheet('1,Thing,,,,,abc,,,,,,,,,,,'));
      expect(rows[0].cost).toBeNull();
      expect(rows[0].estimated_retail).toBeNull();
      expect(rows[0].price).toBeNull();
    });
  });

  describe('quantity', () => {
    it('parses to an integer', () => {
      const { rows } = parseAuctionCSV(sheet('1,Thing,,,,,,,,,,,,,,,,12'));
      expect(rows[0].quantity).toBe(12);
    });

    it('nulls a non-number rather than storing NaN', () => {
      const { rows } = parseAuctionCSV(sheet('1,Thing,,,,,,,,,,,,,,,,many'));
      expect(rows[0].quantity).toBeNull();
    });
  });

  describe('multi-value cells', () => {
    it('splits, trims, drops empties and dedupes', () => {
      const { rows } = parseAuctionCSV(sheet(
        '1,Thing,,,,,,,,,,,,," a , b ,, a ","x,,y, x ",,'
      ));
      expect(rows[0].subcategory).toEqual(['a', 'b']);
      expect(rows[0].tags).toEqual(['x', 'y']);
    });

    // The columns are NOT NULL DEFAULT '{}' — a null would be rejected.
    it('gives [] for a blank cell, never null', () => {
      const { rows } = parseAuctionCSV(sheet('1,Thing,,,,,,,,,,,,,,,,'));
      expect(rows[0].subcategory).toEqual([]);
      expect(rows[0].tags).toEqual([]);
    });

    it('is case-sensitive when deduping', () => {
      const { rows } = parseAuctionCSV(sheet('1,Thing,,,,,,,,,,,,,,"a, A",,'));
      expect(rows[0].tags).toEqual(['a', 'A']);
    });
  });

  describe('dates', () => {
    it('converts M/D/YYYY and MM/DD/YY to ISO', () => {
      const { rows } = parseAuctionCSV(sheet(
        '1,A,,,,,,,,3/5/2026,,,,,,,,',
        '2,B,,,,,,,,12/25/26,,,,,,,,',
      ));
      expect(rows[0].date_bought).toBe('2026-03-05');
      expect(rows[1].date_bought).toBe('2026-12-25');
    });

    it('splits an auction date range, and handles a single date', () => {
      const { rows } = parseAuctionCSV(sheet(
        '1,A,,,,,,,,,,,2/28/2026 - 3/3/2026,,,,,',
        '2,B,,,,,,,,,,,3/29/2026,,,,,',
      ));
      expect(rows[0].auction_date).toBe('2026-02-28');
      expect(rows[0].auction_date_end).toBe('2026-03-03');
      expect(rows[1].auction_date).toBe('2026-03-29');
      expect(rows[1].auction_date_end).toBeNull();
    });

    // Splitting on any hyphen broke these: an ISO date contains hyphens, so the
    // range the export itself writes used to re-import as null.
    it('splits an ISO range, and keeps a lone ISO date whole', () => {
      const { rows } = parseAuctionCSV(sheet(
        '1,A,,,,,,,,,,,2026-02-28 - 2026-03-03,,,,,',
        '2,B,,,,,,,,,,,2026-03-29,,,,,',
      ));
      expect(rows[0].auction_date).toBe('2026-02-28');
      expect(rows[0].auction_date_end).toBe('2026-03-03');
      expect(rows[1].auction_date).toBe('2026-03-29');
      expect(rows[1].auction_date_end).toBeNull();
    });

    it('handles an unspaced slash range and an en dash', () => {
      const { rows } = parseAuctionCSV(sheet(
        '1,A,,,,,,,,,,,1/22/2026-1/27/2026,,,,,',
        '2,B,,,,,,,,,,,2026-01-22 – 2026-01-27,,,,,',
      ));
      expect(rows[0].auction_date).toBe('2026-01-22');
      expect(rows[0].auction_date_end).toBe('2026-01-27');
      expect(rows[1].auction_date).toBe('2026-01-22');
      expect(rows[1].auction_date_end).toBe('2026-01-27');
    });

    it('nulls an unrecognised date rather than sending it to Postgres', () => {
      const { rows } = parseAuctionCSV(sheet('1,A,,,,,,,,next tuesday,,,,,,,,'));
      expect(rows[0].date_bought).toBeNull();
    });
  });

  describe('structure', () => {
    it('finds the header row under a Google Sheets title row', () => {
      const { rows, errors } = parseAuctionCSV(
        'Inventory Master Sheet\n' + HEADER + '\n1,Thing,,,,,,,,,,,,,,,,'
      );
      expect(errors.filter(e => e.row === 0)).toHaveLength(0);
      expect(rows).toHaveLength(1);
    });

    it('tolerates a BOM', () => {
      const { rows } = parseAuctionCSV('\uFEFF' + sheet('1,Thing,,,,,,,,,,,,,,,,'));
      expect(rows[0].sku).toBe('1');
    });

    it('blocks on a missing title column', () => {
      const { rows, errors } = parseAuctionCSV('sku,cost\n1,5');
      expect(rows).toHaveLength(0);
      expect(errors[0].row).toBe(0);
      expect(errors[0].message).toMatch(/title/i);
    });

    it('blocks on empty input', () => {
      const { rows, errors } = parseAuctionCSV('');
      expect(rows).toHaveLength(0);
      expect(errors[0].row).toBe(0);
    });

    it('skips a row with no SKU and reports its line number', () => {
      const { rows, errors } = parseAuctionCSV(sheet(
        '1,Thing,,,,,,,,,,,,,,,,',
        ',Nameless,,,,,,,,,,,,,,,,',
      ));
      expect(rows).toHaveLength(1);
      expect(errors).toEqual([{ row: 3, message: expect.stringMatching(/skipped/) }]);
    });

    it('reports duplicate SKUs within one upload', () => {
      const { duplicateSKUs } = parseAuctionCSV(sheet(
        '1,A,,,,,,,,,,,,,,,,',
        '1,B,,,,,,,,,,,,,,,,',
      ));
      expect(duplicateSKUs).toEqual(['1']);
    });
  });

  // The file is linked from the home page as the import template, so it has to
  // actually parse — including its quoted, comma-bearing cells.
  it('parses public/example-inventory.csv cleanly', () => {
    const file = readFileSync(
      path.join(process.cwd(), 'public', 'example-inventory.csv'),
      'utf8',
    );
    const { rows, errors, duplicateSKUs } = parseAuctionCSV(file);

    expect(errors).toEqual([]);
    expect(duplicateSKUs).toEqual([]);
    expect(rows).toHaveLength(20);

    const first = rows[0];
    expect(first.sku).toBe('100001');
    expect(first.cost).toBe(42);
    expect(first.price).toBe(129.99);
    expect(first.subcategory).toEqual(['Power Tools', 'Drills']);
    expect(first.tags).toEqual(['dewalt', 'cordless', 'heavy']);

    // Exercises the blanks and the zeroes the file is built to cover.
    const freeLot = rows.find(r => r.sku === '100016')!;
    expect(freeLot.cost).toBe(0);
    const unsorted = rows.find(r => r.sku === '100020')!;
    expect(unsorted.quantity).toBe(0);
    expect(unsorted.condition).toBeNull();
    expect(rows.find(r => r.sku === '100003')!.price).toBeNull();
  });
});
