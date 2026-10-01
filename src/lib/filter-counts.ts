// src/lib/filter-counts.ts
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ItemFacets, ItemStatus } from './types';
import { COUNTED_STATUSES, EMPTY_COUNTS, type StatusCounts } from './item-counts';
import { escapeLikeTerm, type ItemFilters } from './item-query';

/** One option in a filter dropdown. `count` is 0 when picking it would show nothing. */
export interface FacetCount {
  value: string;
  count: number;
}

/** A day, with the month it belongs under. */
export interface DateCount extends FacetCount {
  month: string;
}

/**
 * Everything the filter UI needs to render itself, from one round trip.
 *
 * The status chip counts and the per-option counts come from the same filtered
 * set, so they cannot disagree — and the alternative is a count query per
 * option, which a real batch (714 tags, 145 subcategories) turns into 900+ round
 * trips per selection change.
 */
export interface FilterCounts {
  statuses: StatusCounts;
  category: FacetCount[];
  subcategory: FacetCount[];
  tags: FacetCount[];
  season: FacetCount[];
  months: FacetCount[];
  dates: DateCount[];
}

export const EMPTY_FILTER_COUNTS: FilterCounts = {
  statuses: EMPTY_COUNTS,
  category: [], subcategory: [], tags: [], season: [], months: [], dates: [],
};

function asFacetCounts(value: unknown): FacetCount[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap(entry => {
    if (!entry || typeof entry !== 'object') return [];
    const { value: v, count } = entry as Record<string, unknown>;
    return typeof v === 'string' ? [{ value: v, count: Number(count) || 0 }] : [];
  });
}

function asDateCounts(value: unknown): DateCount[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap(entry => {
    if (!entry || typeof entry !== 'object') return [];
    const { value: v, count, month } = entry as Record<string, unknown>;
    return typeof v === 'string' && typeof month === 'string'
      ? [{ value: v, month, count: Number(count) || 0 }]
      : [];
  });
}

function asStatusCounts(value: unknown): StatusCounts {
  const counts = { ...EMPTY_COUNTS };
  if (!value || typeof value !== 'object') return counts;
  const raw = value as Record<string, unknown>;
  for (const status of COUNTED_STATUSES) {
    counts[status] = Number(raw[status]) || 0;
    counts.all += counts[status];
  }
  return counts;
}

/**
 * Call `item_filter_counts` (migration 006) for the given filters.
 *
 * Never throws. It sits in the review page's `Promise.all`, so a rejection would
 * take the whole screen to a 500 — which is what would happen in the window
 * between a deploy and the migration being applied. Empty counts mean the
 * dropdowns go quiet while search, the list and the status filter keep working.
 */
export async function getFilterCounts(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  batchId: string,
  filters: ItemFilters,
): Promise<FilterCounts> {
  try {
    const { data, error } = await supabase.rpc('item_filter_counts', {
      p_batch_id: batchId,
      // Escaped the same way applyItemFilters escapes it, so the counts match
      // the rows: the function interpolates this into an ILIKE pattern.
      p_search: filters.search ? escapeLikeTerm(filters.search) : '',
      p_status: filters.status === 'all' ? null : (filters.status as ItemStatus),
      p_categories: filters.category,
      p_subcategories: filters.subcategory,
      p_tags: filters.tags,
      p_seasons: filters.season,
      p_months: filters.months,
      p_dates: filters.dates,
    });
    if (error || !data) return EMPTY_FILTER_COUNTS;

    const payload = data as Record<string, unknown>;
    return {
      statuses: asStatusCounts(payload.statuses),
      category: asFacetCounts(payload.category),
      subcategory: asFacetCounts(payload.subcategory),
      tags: asFacetCounts(payload.tags),
      season: asFacetCounts(payload.season),
      months: asFacetCounts(payload.months),
      dates: asDateCounts(payload.dates),
    };
  } catch {
    return EMPTY_FILTER_COUNTS;
  }
}

/**
 * Just the values, for the suggestion lists in the detail panes (the datalists
 * and the subcategory/tag chip editors). They want the batch's vocabulary, not
 * how many rows currently match.
 */
export function facetValuesFrom(counts: FilterCounts): ItemFacets {
  return {
    dateBought: counts.dates.map(d => d.value),
    categories: [...counts.category].map(c => c.value).sort(),
    subcategories: [...counts.subcategory].map(c => c.value).sort(),
    tags: [...counts.tags].map(c => c.value).sort(),
    seasons: [...counts.season].map(c => c.value).sort(),
  };
}
