// src/lib/item-update.ts
import { EDITABLE_ITEM_FIELDS, type EditableItemField, type ItemStatus, type ItemUpdate } from './types';

/**
 * How each editable field is validated and coerced on the way in.
 *
 * Before this existed, `PATCH /api/items/[id]` spread the request body straight
 * into `supabase.update()` — so any column in the row was writable by anyone who
 * could reach the route: sku, cost, created_at, the lot. The keys come from
 * EDITABLE_ITEM_FIELDS, the same list `ItemUpdate` is derived from, so the type
 * the client builds and the keys the server forwards cannot drift apart.
 *
 * Note `cost` is absent: what we paid comes from the auction sheet and is not
 * corrected on the floor. Fixing a mistyped cost means re-uploading the batch.
 */
type FieldKind = 'status' | 'text' | 'required-text' | 'money' | 'count' | 'multi';

const FIELD_KIND: Record<EditableItemField, FieldKind> = {
  status: 'status',
  title: 'required-text',
  description: 'text',
  condition: 'text',
  season: 'text',
  category: 'text',
  shelf_location: 'text',
  notes: 'text',
  subcategory: 'multi',
  tags: 'multi',
  estimated_retail: 'money',
  price: 'money',
  sale_price: 'money',
  quantity: 'count',
};

const STATUSES: ItemStatus[] = [
  'pending', 'have_it', 'dont_have', 'broken', 'partial', 'sold', 'personal_use',
];

/** More than this in one cell is a paste accident, not a taxonomy. */
const MAX_MULTI = 32;

type Picked = { update: ItemUpdate } | { error: string };

function coerceNumber(field: string, value: unknown, integer: boolean): number | null | string {
  if (value === null || value === undefined || value === '') return null;
  const n = typeof value === 'number' ? value : Number(String(value).replace(/[$,]/g, ''));
  if (!Number.isFinite(n)) return `${field} must be a number`;
  if (n < 0) return `${field} cannot be negative`;
  if (integer && !Number.isInteger(n)) return `${field} must be a whole number`;
  return n;
}

/**
 * Keep only allow-listed keys and coerce each to its field's shape.
 *
 * A present but invalid value is an error, not a silent drop — a broken client
 * should be loud rather than appear to have saved.
 */
export function pickItemUpdate(body: Record<string, unknown>): Picked {
  const update: Record<string, unknown> = {};

  for (const field of EDITABLE_ITEM_FIELDS) {
    if (!(field in body)) continue;
    const raw = body[field];

    switch (FIELD_KIND[field]) {
      case 'status': {
        if (!STATUSES.includes(raw as ItemStatus)) return { error: `Unknown status: ${String(raw)}` };
        update[field] = raw;
        break;
      }
      case 'required-text': {
        const text = String(raw ?? '').trim();
        if (!text) return { error: `${field} cannot be empty` };
        update[field] = text;
        break;
      }
      case 'text': {
        const text = raw == null ? '' : String(raw).trim();
        update[field] = text || null;
        break;
      }
      case 'money':
      case 'count': {
        const n = coerceNumber(field, raw, FIELD_KIND[field] === 'count');
        if (typeof n === 'string') return { error: n };
        update[field] = n;
        break;
      }
      case 'multi': {
        if (!Array.isArray(raw)) return { error: `${field} must be a list` };
        const values = [...new Set(raw.map(v => String(v).trim()).filter(Boolean))];
        if (values.length > MAX_MULTI) return { error: `Too many values for ${field}` };
        // [] rather than null: the columns are NOT NULL DEFAULT '{}'.
        update[field] = values;
        break;
      }
    }
  }

  if (Object.keys(update).length === 0) {
    return { error: 'No editable fields in request' };
  }

  return { update: update as ItemUpdate };
}
