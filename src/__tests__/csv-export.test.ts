import { buildInternalCSV, buildShopifyCSV, buildSoldCSV, buildPersonalUseCSV } from '@/lib/csv-export';
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
  company_name: 'BidSpotter',
  location_bought: 'Dallas TX',
  auction_date: '2025-03-28',
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

describe('buildInternalCSV', () => {
  it('includes have_it items', () => {
    const csv = buildInternalCSV([makeItem()]);
    expect(csv).toContain('LQ-001');
    expect(csv).toContain('Power Drill Set');
  });

  it('includes broken items', () => {
    const csv = buildInternalCSV([makeItem({ status: 'broken' })]);
    expect(csv).toContain('LQ-001');
  });

  it('includes partial items', () => {
    const csv = buildInternalCSV([makeItem({ status: 'partial' })]);
    expect(csv).toContain('LQ-001');
  });

  it('excludes dont_have items', () => {
    const csv = buildInternalCSV([makeItem({ status: 'dont_have' })]);
    expect(csv).not.toContain('LQ-001');
  });

  it('excludes pending items', () => {
    const csv = buildInternalCSV([makeItem({ status: 'pending' })]);
    expect(csv).not.toContain('LQ-001');
  });

  it('includes all expected columns', () => {
    const csv = buildInternalCSV([makeItem()]);
    expect(csv).toContain('Qty Good');
    expect(csv).toContain('Qty Broken');
    expect(csv).toContain('Qty Sold');
    expect(csv).toContain('Shelf Location');
  });
});

describe('buildShopifyCSV', () => {
  it('maps title to Handle (slugified) and Title', () => {
    const csv = buildShopifyCSV([makeItem()]);
    expect(csv).toContain('power-drill-set');
    expect(csv).toContain('Power Drill Set');
  });

  it('sets Variant Inventory Qty to qty_good minus qty_sold', () => {
    const csv = buildShopifyCSV([makeItem({ qty_good: 3, qty_sold: 1 })]);
    const lines = csv.split('\n');
    const headers = lines[0].split(',');
    const invQtyIdx = headers.findIndex(h => h.includes('Inventory Qty'));
    const dataFields = lines[1].split(',');
    expect(parseInt(dataFields[invQtyIdx])).toBe(2);
  });

  it('clamps inventory qty to 0 when sold exceeds good', () => {
    const csv = buildShopifyCSV([makeItem({ qty_good: 1, qty_sold: 3 })]);
    const lines = csv.split('\n');
    const headers = lines[0].split(',');
    const invQtyIdx = headers.findIndex(h => h.includes('Inventory Qty'));
    const dataFields = lines[1].split(',');
    expect(parseInt(dataFields[invQtyIdx])).toBe(0);
  });

  it('leaves Price column blank', () => {
    const csv = buildShopifyCSV([makeItem()]);
    const headers = csv.split('\n')[0].split(',');
    const priceIdx = headers.findIndex(h => h.includes('Variant Price'));
    expect(priceIdx).toBeGreaterThan(-1);
    const dataRow = csv.split('\n')[1].split(',');
    expect(dataRow[priceIdx]).toBe('');
  });

  it('excludes dont_have and pending items', () => {
    const items = [
      makeItem({ sku: 'LQ-001', status: 'dont_have' }),
      makeItem({ sku: 'LQ-002', status: 'pending' }),
    ];
    const csv = buildShopifyCSV(items);
    expect(csv).not.toContain('LQ-001');
    expect(csv).not.toContain('LQ-002');
  });

  it('excludes sold items', () => {
    const csv = buildShopifyCSV([makeItem({ status: 'sold' })]);
    expect(csv).not.toContain('LQ-001');
  });

  it('excludes personal_use items', () => {
    const csv = buildShopifyCSV([makeItem({ status: 'personal_use' })]);
    expect(csv).not.toContain('LQ-001');
  });
});

describe('buildInternalCSV — sold/personal_use exclusions', () => {
  it('excludes sold items', () => {
    const csv = buildInternalCSV([makeItem({ status: 'sold' })]);
    expect(csv).not.toContain('LQ-001');
  });

  it('excludes personal_use items', () => {
    const csv = buildInternalCSV([makeItem({ status: 'personal_use' })]);
    expect(csv).not.toContain('LQ-001');
  });
});

describe('buildSoldCSV', () => {
  it('includes only sold items', () => {
    const items = [
      makeItem({ sku: 'LQ-001', status: 'sold' }),
      makeItem({ sku: 'LQ-002', status: 'have_it' }),
      makeItem({ sku: 'LQ-003', status: 'personal_use' }),
    ];
    const csv = buildSoldCSV(items);
    expect(csv).toContain('LQ-001');
    expect(csv).not.toContain('LQ-002');
    expect(csv).not.toContain('LQ-003');
  });

  it('includes the correct columns', () => {
    const csv = buildSoldCSV([makeItem({ status: 'sold' })]);
    const headers = csv.split('\n')[0];
    expect(headers).toContain('SKU');
    expect(headers).toContain('Title');
    expect(headers).toContain('Cost');
    expect(headers).toContain('Sale Price');
    expect(headers).toContain('Auction Date');
    expect(headers).toContain('Notes');
  });
});

describe('buildPersonalUseCSV', () => {
  it('includes only personal_use items', () => {
    const items = [
      makeItem({ sku: 'LQ-001', status: 'personal_use' }),
      makeItem({ sku: 'LQ-002', status: 'have_it' }),
      makeItem({ sku: 'LQ-003', status: 'sold' }),
    ];
    const csv = buildPersonalUseCSV(items);
    expect(csv).toContain('LQ-001');
    expect(csv).not.toContain('LQ-002');
    expect(csv).not.toContain('LQ-003');
  });
});
