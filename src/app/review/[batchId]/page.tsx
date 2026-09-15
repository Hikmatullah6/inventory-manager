// src/app/review/[batchId]/page.tsx
import { notFound } from 'next/navigation';
import { getSupabaseServer } from '@/lib/supabase-server';
import { getStatusCounts } from '@/lib/item-counts';
import ReviewClient from '@/components/review/ReviewClient';
import type { Item } from '@/lib/types';

/** Must match the client's opening filter and sort, and /api/items' page size. */
const INITIAL_STATUS = 'pending';
const INITIAL_SORT = { column: 'date_bought', ascending: true };
const PAGE_SIZE = 50;

export default async function ReviewPage({ params }: { params: Promise<{ batchId: string }> }) {
  const { batchId } = await params;
  const supabase = getSupabaseServer();

  // Batch, progress and the first page of items all at once. This used to be a
  // fetch of every batch in the account (two count queries each) followed by a
  // second fetch for the items, with a blank screen until both landed.
  const [batchResult, totalResult, reviewedResult, itemsResult, counts] = await Promise.all([
    supabase.from('auction_batches').select('id, name, imported_at, pin_hash').eq('id', batchId).single(),
    supabase.from('items').select('*', { count: 'exact', head: true }).eq('batch_id', batchId),
    supabase.from('items').select('*', { count: 'exact', head: true }).eq('batch_id', batchId).neq('status', 'pending'),
    supabase
      .from('items')
      .select('*', { count: 'exact' })
      .eq('batch_id', batchId)
      .eq('status', INITIAL_STATUS)
      .range(0, PAGE_SIZE - 1)
      .order(INITIAL_SORT.column, { ascending: INITIAL_SORT.ascending })
      .order('id', { ascending: true }),
    getStatusCounts(supabase, batchId),
  ]);

  if (batchResult.error || !batchResult.data) notFound();
  const batch = batchResult.data;

  return (
    <ReviewClient
      batch={{
        id: batch.id,
        name: batch.name,
        imported_at: batch.imported_at,
        has_pin: batch.pin_hash !== null,
        item_count: totalResult.count ?? 0,
        reviewed_count: reviewedResult.count ?? 0,
      }}
      initialItems={{
        items: (itemsResult.data ?? []) as Item[],
        total: itemsResult.count ?? 0,
        page: 1,
        pageSize: PAGE_SIZE,
      }}
      initialCounts={counts}
    />
  );
}
