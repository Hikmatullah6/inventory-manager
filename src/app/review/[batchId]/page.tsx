'use client';
import { useState, useCallback, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { AuctionBatch, Item, ItemStatus, ItemUpdate } from '@/lib/types';
import { useItems } from '@/hooks/useItems';
import { useItemUpdate } from '@/hooks/useItemUpdate';
import ReviewHeader from '@/components/review/ReviewHeader';
import SearchFilter from '@/components/review/SearchFilter';
import CardView from '@/components/review/CardView';
import TableView from '@/components/review/TableView';

export default function ReviewPage() {
  const { batchId } = useParams<{ batchId: string }>();
  const [view, setView] = useState<'card' | 'table'>('table');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<ItemStatus | 'all'>('pending');
  const [page, setPage] = useState(1);
  const [cardIndex, setCardIndex] = useState(0);
  const [localItems, setLocalItems] = useState<Item[]>([]);
  const [batch, setBatch] = useState<AuctionBatch | null>(null);

  // Fetch batch info for the header (name + reviewed/total counts)
  useEffect(() => {
    fetch('/api/batches')
      .then(r => r.json())
      .then((batches: AuctionBatch[]) => {
        const found = batches.find(b => b.id === batchId);
        if (found) setBatch(found);
      });
  }, [batchId]);

  const { data, loading } = useItems({ batchId, search, status, page });

  // Sync items from server into local state so we can apply optimistic updates
  useEffect(() => {
    if (data && !loading) {
      setLocalItems(data.items);
      setCardIndex(0);
    }
  }, [data, loading]);

  const { updateItem } = useItemUpdate(
    useCallback((updated: Item) => {
      setLocalItems(prev => prev.map(i => i.id === updated.id ? updated : i));
    }, [])
  );

  const handleSearch = useCallback((q: string) => {
    setSearch(q);
    setPage(1);
  }, []);

  const handleStatus = useCallback((s: ItemStatus | 'all') => {
    setStatus(s);
    setPage(1);
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <ReviewHeader
        batchName={batch?.name ?? '...'}
        batchId={batchId}
        reviewed={batch?.reviewed_count ?? 0}
        total={batch?.item_count ?? 0}
        view={view}
        onViewChange={setView}
      />
      <div className="max-w-4xl mx-auto px-4 py-4 space-y-4">
        <SearchFilter onSearch={handleSearch} onStatus={handleStatus} status={status} />

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
            onUpdate={updateItem}
          />
        )}

        {!loading && view === 'table' && (
          <TableView items={localItems} onUpdate={updateItem} />
        )}

        {data && data.total > data.pageSize && (
          <div className="flex items-center justify-center gap-4 pb-4">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 text-sm rounded bg-gray-700 text-white disabled:opacity-40 hover:bg-gray-600 disabled:cursor-not-allowed"
            >
              ← Prev
            </button>
            <span className="text-sm text-gray-400">
              Page {page} of {Math.ceil(data.total / data.pageSize)}
            </span>
            <button
              onClick={() => setPage(p => Math.min(Math.ceil(data.total / data.pageSize), p + 1))}
              disabled={page === Math.ceil(data.total / data.pageSize)}
              className="px-3 py-1 text-sm rounded bg-gray-700 text-white disabled:opacity-40 hover:bg-gray-600 disabled:cursor-not-allowed"
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
