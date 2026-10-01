/** @jest-environment node */
import {
  EMPTY_FILTER_COUNTS, facetValuesFrom, getFilterCounts, type FilterCounts,
} from '@/lib/filter-counts';
import { DEFAULT_FILTERS, type ItemFilters } from '@/lib/item-query';

/** Stands in for the Supabase client; records the rpc args and returns a payload. */
function client(result: { data?: unknown; error?: unknown } | (() => never)) {
  const calls: { fn: string; args: Record<string, unknown> }[] = [];
  return {
    calls,
    supabase: {
      rpc: async (fn: string, args: Record<string, unknown>) => {
        calls.push({ fn, args });
        if (typeof result === 'function') result();
        return result;
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any,
  };
}

const PAYLOAD = {
  statuses: { pending: 4000, have_it: 80, broken: 5 },
  category: [{ value: 'Tools & Hardware', count: 912 }, { value: 'Automotive', count: 0 }],
  subcategory: [{ value: 'Power Tools', count: 120 }],
  tags: [{ value: 'tools', count: 300 }, { value: 'diy', count: 12 }],
  season: [{ value: 'Year-Round', count: 3800 }],
  months: [{ value: '2026-09', count: 500 }, { value: '2026-08', count: 300 }],
  dates: [
    { value: '2026-09-27', month: '2026-09', count: 40 },
    { value: '2026-08-16', month: '2026-08', count: 25 },
  ],
};

const filters = (over: Partial<ItemFilters> = {}): ItemFilters => ({ ...DEFAULT_FILTERS, ...over });

describe('getFilterCounts', () => {
  it('sends every filter to the function, with the status mapped off "all"', async () => {
    const { supabase, calls } = client({ data: PAYLOAD });
    await getFilterCounts(supabase, 'b1', filters({
      status: 'have_it',
      category: ['Tools & Hardware'],
      subcategory: ['Power Tools'],
      tags: ['diy'],
      season: ['Winter'],
      months: ['2026-09'],
      dates: ['2026-09-27'],
    }));

    expect(calls[0].fn).toBe('item_filter_counts');
    expect(calls[0].args).toMatchObject({
      p_batch_id: 'b1',
      p_status: 'have_it',
      p_categories: ['Tools & Hardware'],
      p_subcategories: ['Power Tools'],
      p_tags: ['diy'],
      p_seasons: ['Winter'],
      p_months: ['2026-09'],
      p_dates: ['2026-09-27'],
    });
  });

  it('sends null for "all", so the function does not filter by status', async () => {
    const { supabase, calls } = client({ data: PAYLOAD });
    await getFilterCounts(supabase, 'b1', filters({ status: 'all' }));
    expect(calls[0].args.p_status).toBeNull();
  });

  // The counts must describe the same rows the list query returns, and
  // applyItemFilters escapes before building its ilike.
  it('escapes the search term the same way the row query does', async () => {
    const { supabase, calls } = client({ data: PAYLOAD });
    await getFilterCounts(supabase, 'b1', filters({ search: '50%' }));
    expect(calls[0].args.p_search).toBe('50\\%');
  });

  it('sums the status counts into `all` and fills missing statuses with 0', async () => {
    const { supabase } = client({ data: PAYLOAD });
    const counts = await getFilterCounts(supabase, 'b1', filters());
    expect(counts.statuses.pending).toBe(4000);
    expect(counts.statuses.have_it).toBe(80);
    expect(counts.statuses.sold).toBe(0);
    expect(counts.statuses.all).toBe(4085);
  });

  it('keeps zero-count options, which are what the UI greys out', async () => {
    const { supabase } = client({ data: PAYLOAD });
    const counts = await getFilterCounts(supabase, 'b1', filters());
    expect(counts.category).toEqual([
      { value: 'Tools & Hardware', count: 912 },
      { value: 'Automotive', count: 0 },
    ]);
  });

  it('carries each day’s month through, so the UI can nest it', async () => {
    const { supabase } = client({ data: PAYLOAD });
    const counts = await getFilterCounts(supabase, 'b1', filters());
    expect(counts.dates).toEqual([
      { value: '2026-09-27', month: '2026-09', count: 40 },
      { value: '2026-08-16', month: '2026-08', count: 25 },
    ]);
  });

  describe('failure', () => {
    // It sits in the review page's Promise.all; throwing would 500 the screen,
    // which is exactly what happens before migration 006 is applied.
    it('returns empty counts when the function is missing', async () => {
      const { supabase } = client({ error: { message: 'function does not exist' } });
      await expect(getFilterCounts(supabase, 'b1', filters())).resolves.toEqual(EMPTY_FILTER_COUNTS);
    });

    it('returns empty counts when the call throws', async () => {
      const { supabase } = client(() => { throw new Error('network'); });
      await expect(getFilterCounts(supabase, 'b1', filters())).resolves.toEqual(EMPTY_FILTER_COUNTS);
    });

    it('ignores malformed entries rather than rendering undefined options', async () => {
      const { supabase } = client({ data: { category: [null, 'nope', { count: 3 }, { value: 'Tools', count: 9 }] } });
      const counts = await getFilterCounts(supabase, 'b1', filters());
      expect(counts.category).toEqual([{ value: 'Tools', count: 9 }]);
    });
  });
});

describe('facetValuesFrom', () => {
  it('gives the detail panes plain sorted vocabulary, without counts', () => {
    const counts: FilterCounts = {
      ...EMPTY_FILTER_COUNTS,
      category: [{ value: 'Tools', count: 9 }, { value: 'Automotive', count: 0 }],
      tags: [{ value: 'zeta', count: 5 }, { value: 'alpha', count: 1 }],
      dates: [{ value: '2026-09-27', month: '2026-09', count: 2 }],
    };
    const values = facetValuesFrom(counts);
    // Alphabetical here, not count order: these are for type-ahead suggestions.
    expect(values.categories).toEqual(['Automotive', 'Tools']);
    expect(values.tags).toEqual(['alpha', 'zeta']);
    expect(values.dateBought).toEqual(['2026-09-27']);
  });
});
