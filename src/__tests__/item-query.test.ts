import {
  applyItemFilters, applySort, countSelectedFacets, DEFAULT_FILTERS, DEFAULT_SORT,
  escapeLikeTerm, filtersToParams, monthEnd, monthStart, pageRange, PAGE_SIZE,
  parseItemFilters, SORT_KEYS, SORT_MAP, type ItemFilters,
} from '@/lib/item-query';

/** Records every predicate instead of talking to Supabase. */
function recorder() {
  const calls: [string, ...unknown[]][] = [];
  const builder = {
    eq(c: string, v: unknown) { calls.push(['eq', c, v]); return this; },
    in(c: string, v: readonly unknown[]) { calls.push(['in', c, v]); return this; },
    ilike(c: string, p: string) { calls.push(['ilike', c, p]); return this; },
    overlaps(c: string, v: string[]) { calls.push(['overlaps', c, v]); return this; },
    or(f: string) { calls.push(['or', f]); return this; },
    order(c: string, o: { ascending: boolean }) { calls.push(['order', c, o.ascending]); return this; },
  };
  return { builder, calls };
}

const filters = (over: Partial<ItemFilters> = {}): ItemFilters => ({ ...DEFAULT_FILTERS, ...over });

describe('escapeLikeTerm', () => {
  // These used to reach PostgREST's or() grammar raw, where a comma started a
  // new condition and a percent matched everything.
  it.each([
    ['50%', '50\\%'],
    ['a_b', 'a\\_b'],
    ['C:\\x', 'C:\\\\x'],
  ])('makes %s literal', (input, expected) => {
    expect(escapeLikeTerm(input)).toBe(expected);
  });

  it('leaves a comma and a dot alone — there is no or() grammar to escape from', () => {
    expect(escapeLikeTerm('a,b')).toBe('a,b');
    expect(escapeLikeTerm('foo.bar')).toBe('foo.bar');
  });

  it('drops a literal asterisk, which PostgREST reads as a wildcard', () => {
    expect(escapeLikeTerm('a*b')).toBe('ab');
  });
});

describe('applyItemFilters', () => {
  it('always scopes to the batch', () => {
    const { builder, calls } = recorder();
    applyItemFilters(builder, 'b1', filters({ status: 'all' }));
    expect(calls).toEqual([['eq', 'batch_id', 'b1']]);
  });

  it('searches one generated column, not a two-column or()', () => {
    const { builder, calls } = recorder();
    applyItemFilters(builder, 'b1', filters({ status: 'all', search: '50%' }));
    expect(calls).toContainEqual(['ilike', 'search_text', '%50\\%%']);
  });

  it('uses in() for the single-valued facets and overlaps() for the arrays', () => {
    const { builder, calls } = recorder();
    applyItemFilters(builder, 'b1', filters({
      status: 'all',
      category: ['Tools'],
      season: ['Winter'],
      subcategory: ['Drills'],
      tags: ['dewalt', 'cordless'],
    }));
    expect(calls).toContainEqual(['in', 'category', ['Tools']]);
    expect(calls).toContainEqual(['in', 'season', ['Winter']]);
    // overlaps is "match ANY of these", which is what was asked for.
    expect(calls).toContainEqual(['overlaps', 'subcategory', ['Drills']]);
    expect(calls).toContainEqual(['overlaps', 'tags', ['dewalt', 'cordless']]);
  });

  describe('date bought', () => {
    it('turns a month into a half-open range, so the date index still applies', () => {
      const { builder, calls } = recorder();
      applyItemFilters(builder, 'b1', filters({ status: 'all', months: ['2026-09'] }));
      expect(calls).toContainEqual([
        'or', 'and(date_bought.gte.2026-09-01,date_bought.lt.2026-10-01)',
      ]);
    });

    it('ORs several months together', () => {
      const { builder, calls } = recorder();
      applyItemFilters(builder, 'b1', filters({ status: 'all', months: ['2026-09', '2026-12'] }));
      expect(calls).toContainEqual([
        'or',
        'and(date_bought.gte.2026-09-01,date_bought.lt.2026-10-01),' +
        'and(date_bought.gte.2026-12-01,date_bought.lt.2027-01-01)',
      ]);
    });

    it('narrows to days within the months', () => {
      const { builder, calls } = recorder();
      applyItemFilters(builder, 'b1', filters({
        status: 'all', months: ['2026-09'], dates: ['2026-09-20', '2026-09-27'],
      }));
      expect(calls).toContainEqual(['in', 'date_bought', ['2026-09-20', '2026-09-27']]);
      expect(calls.some(c => c[0] === 'or')).toBe(true);
    });

    it('ignores a malformed month rather than building a broken range', () => {
      const { builder, calls } = recorder();
      applyItemFilters(builder, 'b1', filters({ status: 'all', months: ['nope'] }));
      expect(calls.some(c => c[0] === 'or')).toBe(false);
    });
  });

  it('emits nothing for an empty facet', () => {
    const { builder, calls } = recorder();
    applyItemFilters(builder, 'b1', filters({ status: 'all', tags: [] }));
    expect(calls.filter(c => c[0] === 'overlaps')).toHaveLength(0);
  });

  it('applies the status by default', () => {
    const { builder, calls } = recorder();
    applyItemFilters(builder, 'b1', filters({ status: 'have_it' }));
    expect(calls).toContainEqual(['eq', 'status', 'have_it']);
  });

  // If this leaked into getStatusCounts, all seven chips would show one number.
  it('omits the status under includeStatus: false', () => {
    const { builder, calls } = recorder();
    applyItemFilters(builder, 'b1', filters({ status: 'have_it' }), { includeStatus: false });
    expect(calls.filter(c => c[1] === 'status')).toHaveLength(0);
  });
});

describe('applySort', () => {
  it('always adds the id tiebreak, so paging is deterministic', () => {
    const { builder, calls } = recorder();
    applySort(builder, 'date_bought_desc');
    expect(calls).toEqual([
      ['order', 'date_bought', false],
      ['order', 'id', true],
    ]);
  });
});

describe('parseItemFilters', () => {
  it('falls back on an unknown status or sort instead of querying for it', () => {
    const f = parseItemFilters(new URLSearchParams('status=nonsense&sort=whatever'));
    expect(f.status).toBe('all');
    expect(f.sort).toBe(DEFAULT_SORT);
  });

  it('accepts every sort the UI can offer', () => {
    for (const key of SORT_KEYS) {
      expect(parseItemFilters(new URLSearchParams(`sort=${key}`)).sort).toBe(key);
      expect(SORT_MAP[key].label).toBeTruthy();
    }
  });

  it('clamps the page to 1 and dedupes repeated facet values', () => {
    const f = parseItemFilters(new URLSearchParams('page=0&tags=a&tags=a&tags=b'));
    expect(f.page).toBe(1);
    expect(f.tags).toEqual(['a', 'b']);
  });

  it('round-trips through filtersToParams, including a value with a comma', () => {
    const original = filters({
      search: 'drill, 20v',
      status: 'have_it',
      sort: 'sku_desc',
      page: 3,
      tags: ['Hardware, Fasteners', 'b'],
      months: ['2026-03'],
      dates: ['2026-03-05'],
    });
    const back = parseItemFilters(filtersToParams('b1', original));
    expect(back).toEqual(original);
  });
});

describe('month boundaries', () => {
  it('spans a month, rolling the year over at December', () => {
    expect(monthStart('2026-09')).toBe('2026-09-01');
    expect(monthEnd('2026-09')).toBe('2026-10-01');
    expect(monthEnd('2026-12')).toBe('2027-01-01');
  });
});

describe('helpers', () => {
  it('counts only the facet filters, not search or status', () => {
    expect(countSelectedFacets(filters({ search: 'x', status: 'sold' }))).toBe(0);
    expect(countSelectedFacets(filters({ tags: ['a', 'b'], category: ['Tools'] }))).toBe(3);
    expect(countSelectedFacets(filters({ months: ['2026-09'], dates: ['2026-09-20'] }))).toBe(2);
  });

  it('gives an inclusive, non-overlapping window per page', () => {
    expect(pageRange(1)).toEqual([0, PAGE_SIZE - 1]);
    expect(pageRange(2)).toEqual([PAGE_SIZE, PAGE_SIZE * 2 - 1]);
  });
});
