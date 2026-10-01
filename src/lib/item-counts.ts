// src/lib/item-counts.ts
//
// The status vocabulary the filter chips enumerate. The counts themselves come
// from `item_filter_counts` via src/lib/filter-counts.ts — one round trip for the
// chip totals and every dropdown option together, rather than seven head-only
// queries here plus one query per option.
import type { ItemStatus } from './types';

export const COUNTED_STATUSES: ItemStatus[] = [
  'pending', 'have_it', 'dont_have', 'broken', 'partial', 'sold', 'personal_use',
];

export type StatusCounts = Record<ItemStatus, number> & { all: number };

export const EMPTY_COUNTS: StatusCounts = {
  all: 0, pending: 0, have_it: 0, dont_have: 0, broken: 0, partial: 0, sold: 0, personal_use: 0,
};
