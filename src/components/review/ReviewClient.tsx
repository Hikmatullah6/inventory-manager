'use client';
import { useState, useCallback, useEffect, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { AuctionBatch, Item, ItemStatus, ItemUpdate, ItemsQueryResult } from '@/lib/types';
import { EMPTY_COUNTS, type StatusCounts } from '@/lib/item-counts';
import { useItems } from '@/hooks/useItems';
import { useItemUpdate } from '@/hooks/useItemUpdate';
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
  /** Totals behind each filter chip, counted on the server. Null when locked. */
  initialCounts: StatusCounts | null;
}

export default function ReviewClient({ batch, initialItems, initialCounts }: Props) {
  const batchId = batch.id;
  const router = useRouter();
  const [view, setView] = useState<'card' | 'table'>('table');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<ItemStatus | 'all'>('pending');
  const [sort, setSort] = useState('date_bought_asc');
  const [page, setPage] = useState(1);
  const [cardIndex, setCardIndex] = useState(0);
  const [localItems, setLocalItems] = useState<Item[]>(initialItems?.items ?? []);
  const [counts, setCounts] = useState<StatusCounts>(initialCounts ?? EMPTY_COUNTS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
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
    batchId, search, status, sort, page, initialData: initialItems, enabled: canLoad,
  });

  // Sync items from server into local state so we can apply optimistic updates
  useEffect(() => {
    if (data && !loading) {
      setLocalItems(data.items);
      setCardIndex(0);
    }
  }, [data, loading]);

  // Chip counts cover the whole batch, so they have to be recounted whenever the
  // search term changes — the loaded page is 50 rows and cannot be tallied for
  // an answer about thousands. `search` is already debounced by SearchFilter.
  useEffect(() => {
    if (!canLoad) return;
    let cancelled = false;
    const params = new URLSearchParams({ batchId });
    if (search) params.set('search', search);
    fetch(`/api/items/counts?${params}`)
      .then(r => (r.ok ? r.json() : null))
      .then((next: StatusCounts | null) => { if (!cancelled && next) setCounts(next); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [batchId, search, canLoad]);

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
        [before]: Math.max(0, c[before] - 1),
        [next]: c[next] + 1,
      }));
    }
    updateItem(id, update);
  }, [localItems, updateItem]);

  const handleSearch = useCallback((q: string) => {
    setSearch(q);
    setPage(1);
  }, []);

  const handleStatus = useCallback((s: ItemStatus | 'all') => {
    setStatus(s);
    setPage(1);
  }, []);

  const handleSort = useCallback((s: string) => {
    setSort(s);
    setPage(1);
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
      />
      <div className="w-full max-w-4xl mx-auto px-4 py-4 space-y-4 flex-1 min-h-0 flex flex-col sm:block">
        <div className={phoneDetailOpen ? 'hidden sm:block' : ''}>
          <SearchFilter
            onSearch={handleSearch}
            onStatus={handleStatus}
            status={status}
            sort={sort}
            onSort={handleSort}
            counts={counts}
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
          />
        )}

        {!loading && view === 'table' && (
          <TableView
            items={localItems}
            onUpdate={handleUpdate}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        )}

        {data && data.total > data.pageSize && (
          <div className={`items-center justify-center gap-4 pb-4 ${phoneDetailOpen ? 'hidden sm:flex' : 'flex'}`}>
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 min-h-11 text-sm rounded bg-gray-700 text-white disabled:opacity-40 hover:bg-gray-600 disabled:cursor-not-allowed"
            >
              ← Prev
            </button>
            <span className="text-sm text-gray-400">
              Page {page} of {Math.ceil(data.total / data.pageSize)}
            </span>
            <button
              onClick={() => setPage(p => Math.min(Math.ceil(data.total / data.pageSize), p + 1))}
              disabled={page === Math.ceil(data.total / data.pageSize)}
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
