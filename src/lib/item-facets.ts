// src/lib/item-facets.ts
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ItemFacets } from './types';

export const EMPTY_FACETS: ItemFacets = {
  dateBought: [], categories: [], subcategories: [], tags: [], seasons: [],
};

function asStrings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
}

/**
 * The distinct values behind the date / category / subcategory / tag / season
 * pickers.
 *
 * One round trip to the `item_facets` function (migration 005) rather than
 * downloading the batch to dedupe in JS — subcategory and tags are arrays, so a
 * client-side tally would mean pulling every row of several thousand.
 *
 * It must never throw. This call sits inside the review page's `Promise.all`, so
 * a rejection would take the whole screen to a 500 — which is exactly what would
 * happen in the window between a deploy and migration 005 being applied. Empty
 * facets mean the pickers go quiet while search, the chips and the list work.
 */
export async function getItemFacets(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  batchId: string,
): Promise<ItemFacets> {
  try {
    const { data, error } = await supabase.rpc('item_facets', { p_batch_id: batchId });
    if (error || !data) return EMPTY_FACETS;

    const payload = data as Record<string, unknown>;
    return {
      dateBought: asStrings(payload.dateBought),
      categories: asStrings(payload.categories),
      subcategories: asStrings(payload.subcategories),
      tags: asStrings(payload.tags),
      seasons: asStrings(payload.seasons),
    };
  } catch {
    return EMPTY_FACETS;
  }
}
