import { parseAuctionCSV } from '@/lib/csv-parser';

const VALID_CSV = `sku,title,link,thumbnail link,image count,description,date bought,cost,company name,location bought,auction date,in stock,location
LQ-001,Power Drill Set,https://example.com/1,https://img.com/1.jpg,5,18V drill kit,2025-04-01,24.00,BidSpotter,Dallas TX,2025-03-28,yes,Shelf B2
LQ-002,Air Compressor,https://example.com/2,https://img.com/2.jpg,3,20-gal compressor,2025-04-01,85.00,BidSpotter,Dallas TX,2025-03-28,,`;

const MISSING_TITLE_CSV = `sku,link
LQ-001,https://example.com`;

const EMPTY_CSV = ``;

const DUPLICATE_SKU_CSV = `sku,title
LQ-001,Power Drill
LQ-001,Power Drill Pro`;

describe('parseAuctionCSV', () => {
  it('parses a valid CSV into rows', () => {
    const result = parseAuctionCSV(VALID_CSV);
    expect(result.errors.filter(e => e.row === 0)).toHaveLength(0);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0].sku).toBe('LQ-001');
    expect(result.rows[0].title).toBe('Power Drill Set');
    expect(result.rows[0].cost).toBe(24.00);
    expect(result.rows[0].image_count).toBe(5);
    expect(result.rows[0].thumbnail_url).toBe('https://img.com/1.jpg');
    expect(result.rows[0].shelf_location).toBe('Shelf B2');
  });

  it('returns a blocking error when title column is missing', () => {
    const result = parseAuctionCSV(MISSING_TITLE_CSV);
    expect(result.rows).toHaveLength(0);
    expect(result.errors[0].row).toBe(0);
    expect(result.errors[0].message).toMatch(/title/i);
  });

  it('returns a blocking error for empty CSV', () => {
    const result = parseAuctionCSV(EMPTY_CSV);
    expect(result.rows).toHaveLength(0);
    expect(result.errors[0].row).toBe(0);
  });

  it('detects duplicate SKUs within the same upload', () => {
    const result = parseAuctionCSV(DUPLICATE_SKU_CSV);
    expect(result.duplicateSKUs).toContain('LQ-001');
  });

  it('sets null for empty optional fields', () => {
    const result = parseAuctionCSV(VALID_CSV);
    expect(result.rows[1].shelf_location).toBeNull();
  });

  it('strips dollar signs from cost field', () => {
    const csv = `sku,title,cost\nLQ-001,Drill,$24.99`;
    const result = parseAuctionCSV(csv);
    expect(result.rows[0].cost).toBe(24.99);
  });
});
