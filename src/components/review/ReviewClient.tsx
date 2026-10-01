'use client';
import { useState, useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { AuctionBatch, Item, ItemStatus, ItemUpdate, ItemsQueryResult } from '@/lib/types';
import { EMPTY_FILTER_COUNTS, facetValuesFrom, type FilterCounts } from '@/lib/filter-counts';
import {
  DEFAULT_FILTERS, DEFAULT_SORT, filtersToParams,
  type FacetSelection, type ItemFilters, type SortKey,
} from '@/lib/item-query';
import { useItems } from '@/hooks/useItems';
import { useItemUpdate } from '@/hooks/useItemUpdate';
import { useCostVisible } from '@/hooks/useCostVisible';
import ReviewHeader from '@/components/review/ReviewHeader';
import SearchFilter from '@/components/review/SearchFilter';
import CardView from '@/components/review/CardView';
import TableView from '@/components/review/TableView';
import PinModal from '@/components/PinModal';
import {
  isBatchVerified, isMasterVerified,
  setBatchVerified, storeVerifiedPin, setMasterVerified,
  getVerifiedPin, getMasterPin,
} from '@/lib/session';

/** useSyncExternalStore needs a subscribe function; this value never changes. */
const subscribeNever = () => () => {};

interface Props {
  batch: AuctionBatch;
  /** First page of items, rendered on the server — null while the batch is
   *  locked, so a protected batch's rows never reach the HTML. */
  initialItems: ItemsQueryResult | null;
  /** Status chip totals and every dropdown option's count. Null when locked. */
  initialCounts: FilterCounts | null;
}

export default function ReviewClient({ batch, initialItems, initialCounts }: Props) {
  const batchId = batch.id;
  const router = useRouter();
  const [view, setView] = useState<'card' | 'table'>('table');
  // One object rather than five pieces of state: it is what useItems keys on and
  // what the counts fetch sends, and DEFAULT_FILTERS is the same value the
  // server rendered the first page from, so the two cannot disagree.
  const [filters, setFilters] = useState<ItemFilters>(DEFAULT_FILTERS);
  const [cardIndex, setCardIndex] = useState(0);
  const [localItems, setLocalItems] = useState<Item[]>(initialItems?.items ?? []);
  const [counts, setCounts] = useState<FilterCounts>(initialCounts ?? EMPTY_FILTER_COUNTS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Shared with both detail layouts through a module-level value, so the eye in
  // the header and the figures in the panes always agree.
  const [costVisible, setCostVisible] = useCostVisible();
  const [unlocked, setUnlocked] = useState(false);
  const [reminted, setReminted] = useState(false);

  // The verification cache lives in sessionStorage, which does not exist on the
  // server, so the gate can only be evaluated once hydrated. Read through
  // useSyncExternalStore rather than an effect: no extra render pass, and no
  // flash of the PIN prompt at someone who already unlocked this batch.
  const hydrated = useSyncExternalStore(subscribeNever, () => true, () => false);

  // The server withheld the items, so this browser holds no valid PIN cookie —
  // even if this tab remembers unlocking the batch. A tab that unlocked it
  // before the cookie existed still has the PIN and can mint one silently;
  // one that doesn't gets the prompt rather than an empty screen.
  const serverLocked = batch.has_pin && initialItems === null;
  const storedPin = hydrated && batch.has_pin ? (getVerifiedPin(batchId) ?? getMasterPin()) : null;
  const sessionVerified = hydrated && (isBatchVerified(batchId) || isMasterVerified());
  const pinVerified =
    hydrated && (unlocked || !batch.has_pin || (sessionVerified && (!serverLocked || storedPin !== null)));

  const needsRemint = pinVerified && serverLocked && !unlocked;
  useEffect(() => {
    if (!needsRemint || !storedPin) return;
    let cancelled = false;
    fetch(`/api/batches/${batchId}/verify-pin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: storedPin }),
    })
      .catch(() => {})
      .finally(() => { if (!cancelled) setReminted(true); });
    return () => { cancelled = true; };
  }, [needsRemint, storedPin, batchId]);

  // Nothing may be fetched until the server would recognise us.
  const canLoad = pinVerified && (!needsRemint || reminted);

  const { data, loading } = useItems({
    batchId, filters, initialData: initialItems, enabled: canLoad,
  });

  // Sync items from server into local state so we can apply optimistic updates
  useEffect(() => {
    if (data && !loading) {
      setLocalItems(data.items);
      setCardIndex(0);
    }
  }, [data, loading]);

  // Chip counts cover the whole batch, so they have to be recounted whenever
  // anything except the status narrows the list — the loaded page is 50 rows and
  // cannot be tallied for an answer about thousands. The facet filters go along
  // too: a chip's count has to equal what tapping it would produce.
  //
  // One request behind every number on screen: the status chip totals and each
  // dropdown option's count, so the chips and the dropdowns cannot disagree.
  //
  // Keyed on the search and the facet selection. `status` is pinned to 'all'
  // because the chips enumerate it, and sort and page are pinned because neither
  // can change a total — otherwise a page turn would cost a recount.
  const countsKey = filtersToParams(batchId, {
    ...filters, status: 'all', sort: DEFAULT_SORT, page: 1,
  }).toString();
  useEffect(() => {
    if (!canLoad) return;
    let cancelled = false;
    fetch(`/api/items/counts?${countsKey}`)
      .then(r => (r.ok ? r.json() : null))
      .then((next: FilterCounts | null) => { if (!cancelled && next) setCounts(next); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [countsKey, canLoad]);

  // The detail panes want the batch's vocabulary for their suggestion lists, not
  // the current match counts.
  const facets = useMemo(() => facetValuesFrom(counts), [counts]);

  const { updateItem } = useItemUpdate(
    batchId,
    useCallback((updated: Item) => {
      setLocalItems(prev => prev.map(i => i.id === updated.id ? updated : i));
    }, [])
  );

  // Adjust the chips locally on a status change rather than recounting the
  // batch after every tap.
  const handleUpdate = useCallback((id: string, update: ItemUpdate) => {
    const next = update.status;
    const before = localItems.find(i => i.id === id)?.status;
    if (next && before && next !== before) {
      setCounts(c => ({
        ...c,
        statuses: {
          ...c.statuses,
          [before]: Math.max(0, c.statuses[before] - 1),
          [next]: c.statuses[next] + 1,
        },
      }));
    }
    updateItem(id, update);
  }, [localItems, updateItem]);

  // Every filter change resets to page 1: page 3 of the old result set says
  // nothing about the new one. Empty deps keep these referentially stable, which
  // is what stops SearchFilter's debounce effect restarting on every render.
  const handleSearch = useCallback((search: string) => {
    setFilters(f => (f.search === search ? f : { ...f, search, page: 1 }));
  }, []);

  const handleStatus = useCallback((status: ItemStatus | 'all') => {
    setFilters(f => ({ ...f, status, page: 1 }));
  }, []);

  const handleSort = useCallback((sort: SortKey) => {
    setFilters(f => ({ ...f, sort, page: 1 }));
  }, []);

  const handleFacets = useCallback((selection: FacetSelection) => {
    setFilters(f => ({ ...f, ...selection, page: 1 }));
  }, []);

  const setPage = useCallback((next: (p: number) => number) => {
    setFilters(f => ({ ...f, page: next(f.page) }));
  }, []);

  if (!hydrated) return null;

  if (!pinVerified) {
    return (
      <PinModal
        batchId={batchId}
        batchName={batch.name}
        mode="access"
        onSuccess={(pin, isMaster) => {
          setBatchVerified(batchId);
          storeVerifiedPin(batchId, pin);
          if (isMaster) setMasterVerified(pin);
          setUnlocked(true);
        }}
        onCancel={() => router.push('/')}
      />
    );
  }

  // The selection is derived from the loaded page, so a filter or search change
  // that drops the item falls back to the list on its own.
  const selectedItem = localItems.find(i => i.id === selectedId) ?? null;
  // On a phone the detail pane owns the whole screen below the header.
  const phoneDetailOpen = view === 'table' && selectedItem !== null;

  // Table view on a phone is a fixed-height column with its own scrollers, so
  // the rail and the detail pane can each scroll independently. Card view and
  // every width from sm: up keep normal document flow.
  const shell = view === 'table'
    ? 'bg-gray-900 text-white h-dvh flex flex-col overflow-hidden sm:h-auto sm:min-h-screen sm:block sm:overflow-visible'
    : 'min-h-screen bg-gray-900 text-white';

  return (
    <div className={shell}>
      <ReviewHeader
        batchName={batch.name}
        batchId={batchId}
        reviewed={batch.reviewed_count}
        total={batch.item_count}
        view={view}
        onViewChange={setView}
        costVisible={costVisible}
        onCostVisible={setCostVisible}
      />
      <div className="w-full max-w-4xl mx-auto px-4 py-4 space-y-4 flex-1 min-h-0 flex flex-col sm:block">
        <div className={phoneDetailOpen ? 'hidden sm:block' : ''}>
          <SearchFilter
            onSearch={handleSearch}
            onStatus={handleStatus}
            status={filters.status}
            sort={filters.sort}
            onSort={handleSort}
            counts={counts}
            facetSelection={filters}
            onFacetSelection={handleFacets}
          />
        </div>

        {loading && (
          <div className="flex items-center justify-center h-32">
            <p className="text-gray-400 text-sm">Loading...</p>
          </div>
        )}

        {!loading && view === 'card' && (
          <CardView
            items={localItems}
            currentIndex={cardIndex}
            total={localItems.length}
            onNavigate={setCardIndex}
            onUpdate={handleUpdate}
            facets={facets}
          />
        )}

        {!loading && view === 'table' && (
          <TableView
            items={localItems}
            onUpdate={handleUpdate}
            selectedId={selectedId}
            onSelect={setSelectedId}
            facets={facets}
          />
        )}

        {data && data.total > data.pageSize && (
          <div className={`items-center justify-center gap-4 pb-4 ${phoneDetailOpen ? 'hidden sm:flex' : 'flex'}`}>
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={filters.page === 1}
              className="px-4 min-h-11 text-sm rounded bg-gray-700 text-white disabled:opacity-40 hover:bg-gray-600 disabled:cursor-not-allowed"
            >
              ← Prev
            </button>
            <span className="text-sm text-gray-400">
              Page {filters.page} of {Math.ceil(data.total / data.pageSize)}
            </span>
            <button
              onClick={() => setPage(p => Math.min(Math.ceil(data.total / data.pageSize), p + 1))}
              disabled={filters.page === Math.ceil(data.total / data.pageSize)}
              className="px-4 min-h-11 text-sm rounded bg-gray-700 text-white disabled:opacity-40 hover:bg-gray-600 disabled:cursor-not-allowed"
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
