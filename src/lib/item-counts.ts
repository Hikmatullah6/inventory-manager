// src/lib/item-counts.ts
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ItemStatus } from './types';

export const COUNTED_STATUSES: ItemStatus[] = [
  'pending', 'have_it', 'dont_have', 'broken', 'partial', 'sold', 'personal_use',
];

export type StatusCounts = Record<ItemStatus, number> & { all: number };

export const EMPTY_COUNTS: StatusCounts = {
  all: 0, pending: 0, have_it: 0, dont_have: 0, broken: 0, partial: 0, sold: 0, personal_use: 0,
};

/**
 * How many items sit behind each status filter chip.
 *
 * Counted on the server, never from the loaded page — that page is 50 rows out
 * of a possible several thousand, so a client-side tally would be wrong by two
 * orders of magnitude.
 *
 * The search term is applied too, so a chip's count always equals the number of
 * results tapping it would produce.
 */
export async function getStatusCounts(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  batchId: string,
  search = ''
): Promise<StatusCounts> {
  const counted = await Promise.all(
    COUNTED_STATUSES.map(status => {
      let query = supabase
        .from('items')
        .select('*', { count: 'exact', head: true })
        .eq('batch_id', batchId)
        .eq('status', status);
      if (search) query = query.or(`title.ilike.%${search}%,sku.ilike.%${search}%`);
      return query;
    })
  );

  const counts = { ...EMPTY_COUNTS };
  COUNTED_STATUSES.forEach((status, i) => {
    counts[status] = counted[i].count ?? 0;
    counts.all += counts[status];
  });
  return counts;
}
