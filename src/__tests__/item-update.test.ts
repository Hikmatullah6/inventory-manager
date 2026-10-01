import { pickItemUpdate } from '@/lib/item-update';
import { EDITABLE_ITEM_FIELDS } from '@/lib/types';

function ok(body: Record<string, unknown>) {
  const result = pickItemUpdate(body);
  if ('error' in result) throw new Error(`expected success, got: ${result.error}`);
  return result.update;
}

function err(body: Record<string, unknown>) {
  const result = pickItemUpdate(body);
  if (!('error' in result)) throw new Error('expected an error');
  return result.error;
}

describe('pickItemUpdate', () => {
  // The hole this closes: the body's keys went straight to supabase.update().
  describe('the allow-list', () => {
    it('drops keys that are not editable', () => {
      expect(ok({ status: 'have_it', sku: 'HACKED', id: 'x', created_at: 'y', batch_id: 'z' }))
        .toEqual({ status: 'have_it' });
    });

    it('drops cost — what we paid comes from the sheet, not the floor', () => {
      expect(err({ cost: 1 })).toMatch(/no editable fields/i);
      expect(EDITABLE_ITEM_FIELDS).not.toContain('cost');
    });

    it('drops the retired qty fields an older client might still send', () => {
      expect(err({ qty_good: 2, qty_broken: 1, qty_sold: 3 })).toMatch(/no editable fields/i);
    });

    it('refuses a body with nothing editable in it', () => {
      expect(err({})).toMatch(/no editable fields/i);
    });
  });

  describe('status', () => {
    it('accepts a real status', () => {
      expect(ok({ status: 'personal_use' })).toEqual({ status: 'personal_use' });
    });

    it('refuses an unknown one rather than letting Postgres reject it', () => {
      expect(err({ status: 'nonsense' })).toMatch(/unknown status/i);
    });
  });

  describe('text fields', () => {
    it('trims, and maps an emptied field to null', () => {
      expect(ok({ notes: '  a note  ' })).toEqual({ notes: 'a note' });
      expect(ok({ notes: '' })).toEqual({ notes: null });
      expect(ok({ notes: '   ' })).toEqual({ notes: null });
      expect(ok({ description: null })).toEqual({ description: null });
    });

    it('refuses a blank title, which the column forbids', () => {
      expect(err({ title: '   ' })).toMatch(/title cannot be empty/i);
      expect(ok({ title: '  Drill Kit ' })).toEqual({ title: 'Drill Kit' });
    });
  });

  describe('numeric fields', () => {
    it('accepts a number, a numeric string and a currency string', () => {
      expect(ok({ price: 12.5 })).toEqual({ price: 12.5 });
      expect(ok({ price: '12.50' })).toEqual({ price: 12.5 });
      expect(ok({ estimated_retail: '$1,299.00' })).toEqual({ estimated_retail: 1299 });
    });

    it('keeps a zero rather than reading it as unset', () => {
      expect(ok({ price: 0 })).toEqual({ price: 0 });
      expect(ok({ quantity: 0 })).toEqual({ quantity: 0 });
    });

    it('clears on an empty value', () => {
      expect(ok({ price: '' })).toEqual({ price: null });
      expect(ok({ sale_price: null })).toEqual({ sale_price: null });
    });

    it('refuses a negative amount, a non-number, and a fractional quantity', () => {
      expect(err({ price: -5 })).toMatch(/negative/i);
      expect(err({ price: 'abc' })).toMatch(/must be a number/i);
      expect(err({ quantity: 1.5 })).toMatch(/whole number/i);
    });
  });

  describe('multi-value fields', () => {
    it('trims, drops empties and dedupes', () => {
      expect(ok({ tags: [' a ', '', 'a', 'b'] })).toEqual({ tags: ['a', 'b'] });
    });

    // The columns are NOT NULL DEFAULT '{}'.
    it('writes [] for an emptied list, not null', () => {
      expect(ok({ subcategory: [] })).toEqual({ subcategory: [] });
    });

    it('refuses a non-array and an absurd number of values', () => {
      expect(err({ tags: 'a,b' })).toMatch(/must be a list/i);
      expect(err({ tags: Array.from({ length: 40 }, (_, i) => `t${i}`) })).toMatch(/too many/i);
    });
  });

  it('never lets the client set reviewed_at — the server stamps it', () => {
    expect(ok({ status: 'have_it', reviewed_at: '1999-01-01' })).toEqual({ status: 'have_it' });
  });
});
