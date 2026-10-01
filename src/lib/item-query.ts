import type { Item as ItemRow, ItemStatus } from './types';

/**
 * Every item query in the app — the API route, the seven count queries, and the
 * review page's server-rendered first page — is built here.
 *
 * Before this module the search predicate was written out in three files and
 * the first-page query in two. Adding the category / subcategory / tag / season
 * / date filters to three copies is how they drift apart, and the review page's
 * copy drifting is specifically what makes `useItems` seed a `loadedKey` that
 * lies about what is on screen.
 */

/** Rows per page. /api/items, the review page and useItems all read it here. */
export const PAGE_SIZE = 50;

export type SortKey =
  | 'date_bought_desc'
  | 'date_bought_asc'
  | 'sku_asc'
  | 'sku_desc'
  | 'title_asc';

/** The sort vocabulary, with the labels the dropdown renders. */
export const SORT_MAP: Record<SortKey, { column: string; ascending: boolean; label: string }> = {
  date_bought_desc: { column: 'date_bought', ascending: false, label: 'Date bought · newest first' },
  date_bought_asc: { column: 'date_bought', ascending: true, label: 'Date bought · oldest first' },
  sku_asc: { column: 'sku', ascending: true, label: 'SKU · low to high' },
  sku_desc: { column: 'sku', ascending: false, label: 'SKU · high to low' },
  title_asc: { column: 'title', ascending: true, label: 'Title · A to Z' },
};

export const SORT_KEYS = Object.keys(SORT_MAP) as SortKey[];

const STATUSES: ItemStatus[] = [
  'pending', 'have_it', 'dont_have', 'broken', 'partial', 'sold', 'personal_use',
];

/**
 * The five facet filters. Each matches ANY of the selected values; an empty
 * array means the filter is off.
 *
 * `dateBought` is a selection of the batch's actual purchase dates rather than
 * a from/to range: a batch is one or a few buying trips, so the distinct values
 * are short and already in the facets payload — and it keeps all five filters
 * one control type. New-to-old and old-to-new live in the sort, not here.
 */
export interface FacetSelection {
  dateBought: string[];
  category: string[];
  subcategory: string[];
  tags: string[];
  season: string[];
}

export const EMPTY_FACET_SELECTION: FacetSelection = {
  dateBought: [], category: [], subcategory: [], tags: [], season: [],
};

export interface ItemFilters extends FacetSelection {
  /** Raw user text. Never pre-escape it; applyItemFilters handles that. */
  search: string;
  status: ItemStatus | 'all';
  sort: SortKey;
  page: number;
}

/** What the review screen opens on. The server page renders exactly this. */
export const DEFAULT_STATUS: ItemStatus | 'all' = 'pending';
export const DEFAULT_SORT: SortKey = 'date_bought_asc';

export const DEFAULT_FILTERS: ItemFilters = {
  ...EMPTY_FACET_SELECTION,
  search: '',
  status: DEFAULT_STATUS,
  sort: DEFAULT_SORT,
  page: 1,
};

const FACET_KEYS = ['dateBought', 'category', 'subcategory', 'tags', 'season'] as const;

/**
 * Read filters off a query string. Unknown `status` and `sort` values fall back
 * to the defaults rather than reaching Supabase, where an unknown status would
 * silently return zero rows.
 *
 * Multi-value params repeat (`?tags=a&tags=b`) rather than joining on a comma,
 * so a facet value containing a comma survives the round trip.
 */
export function parseItemFilters(sp: URLSearchParams): ItemFilters {
  const status = sp.get('status') ?? 'all';
  const sort = sp.get('sort') ?? '';
  const page = parseInt(sp.get('page') ?? '1', 10);

  const facets = { ...EMPTY_FACET_SELECTION };
  for (const key of FACET_KEYS) {
    facets[key] = [...new Set(sp.getAll(key).map(v => v.trim()).filter(Boolean))];
  }

  return {
    ...facets,
    search: sp.get('search') ?? '',
    status: status === 'all' || STATUSES.includes(status as ItemStatus)
      ? (status as ItemStatus | 'all')
      : 'all',
    sort: SORT_KEYS.includes(sort as SortKey) ? (sort as SortKey) : DEFAULT_SORT,
    page: Number.isFinite(page) ? Math.max(1, page) : 1,
  };
}

/** The inverse, and the only serializer — used by useItems and the counts fetch. */
export function filtersToParams(batchId: string, f: ItemFilters): URLSearchParams {
  const p = new URLSearchParams({
    batchId,
    status: f.status,
    sort: f.sort,
    page: String(f.page),
  });
  if (f.search) p.set('search', f.search);
  for (const key of FACET_KEYS) {
    for (const value of f[key]) p.append(key, value);
  }
  return p;
}

/** How many facet filters are narrowing the list — the "Filters · N" badge. */
export function countSelectedFacets(f: FacetSelection): number {
  return FACET_KEYS.reduce((n, key) => n + f[key].length, 0);
}

/**
 * Neutralise LIKE metacharacters so a search for "50%" means "50%" and not
 * "everything". `\` is Postgres' default LIKE escape, so it has to go first.
 *
 * `*` is PostgREST's own alias for `%` inside an ilike value and has no escape,
 * so it is dropped — a literal `*` is not searchable. Accepted limitation.
 *
 * Note there is no `or()` grammar to escape any more: migration 005 adds a
 * generated `search_text` column (sku + title) so the search is one filter on
 * one column, and supabase-js encodes that value itself.
 */
export function escapeLikeTerm(raw: string): string {
  return raw.replace(/[\\%_]/g, m => `\\${m}`).replace(/\*/g, '');
}

/** Minimal shape of the supabase-js filter builder, so this file needs no client. */
interface FilterBuilder {
  eq(column: string, value: unknown): this;
  in(column: string, values: readonly unknown[]): this;
  ilike(column: string, pattern: string): this;
  overlaps(column: string, value: string[]): this;
  order(column: string, opts: { ascending: boolean }): this;
}

/**
 * The only place the predicates live.
 *
 * `includeStatus: false` is for getStatusCounts, which loops the statuses
 * itself — if the status leaked in there, every chip would show the same number.
 */
export function applyItemFilters<Q>(
  query: Q,
  batchId: string,
  f: ItemFilters,
  opts: { includeStatus?: boolean } = {},
): Q {
  // `Q` is deliberately unconstrained and cast inside: constraining it to
  // FilterBuilder makes the compiler walk supabase-js' recursive builder
  // generics through every chained call and give up ("excessively deep").
  // Callers keep their exact builder type in and out.
  let q = (query as FilterBuilder).eq('batch_id', batchId);

  if (opts.includeStatus !== false && f.status !== 'all') q = q.eq('status', f.status);
  if (f.search) q = q.ilike('search_text', `%${escapeLikeTerm(f.search)}%`);
  if (f.dateBought.length) q = q.in('date_bought', f.dateBought);
  if (f.category.length) q = q.in('category', f.category);
  if (f.season.length) q = q.in('season', f.season);
  if (f.subcategory.length) q = q.overlaps('subcategory', f.subcategory);
  if (f.tags.length) q = q.overlaps('tags', f.tags);

  return q as Q;
}

/**
 * Ties — a null date_bought, two identical SKUs — would otherwise page
 * non-deterministically and the same item could appear on two pages.
 */
export function applySort<Q>(query: Q, sort: SortKey): Q {
  const { column, ascending } = SORT_MAP[sort];
  return (query as FilterBuilder)
    .order(column, { ascending })
    .order('id', { ascending: true }) as Q;
}

/** The inclusive row window for a 1-based page number. */
export function pageRange(page: number): [number, number] {
  const from = (page - 1) * PAGE_SIZE;
  return [from, from + PAGE_SIZE - 1];
}

/**
 * Every item in a batch, for the export.
 *
 * Paginated at 1000 rows so it is not subject to the server-side `max_rows`
 * cap. Ordered by creation so the sheets are stable between exports.
 */
export async function fetchAllItemsForExport(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: { from: (table: string) => any },
  batchId: string,
): Promise<ItemRow[]> {
  const pageSize = 1000;
  const all: ItemRow[] = [];
  let from = 0;

  for (;;) {
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .eq('batch_id', batchId)
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) throw error;
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }

  return all;
}
