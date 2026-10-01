// src/app/review/[batchId]/page.tsx
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { getSupabaseServer } from '@/lib/supabase-server';
import { hasBatchAccess } from '@/lib/batch-access';
import { getFilterCounts } from '@/lib/filter-counts';
import {
  applyItemFilters, applySort, DEFAULT_FILTERS, pageRange, PAGE_SIZE,
} from '@/lib/item-query';
import ReviewClient from '@/components/review/ReviewClient';
import type { Item } from '@/lib/types';

export default async function ReviewPage({ params }: { params: Promise<{ batchId: string }> }) {
  const { batchId } = await params;
  const supabase = getSupabaseServer();
  const [from, to] = pageRange(DEFAULT_FILTERS.page);

  // Batch, progress, the first page of items and every filter count all at once.
  // This used to be a fetch of every batch in the account (two count queries
  // each) followed by a second fetch for the items, with a blank screen until
  // both landed.
  //
  // The first page is built from DEFAULT_FILTERS through the same helpers
  // /api/items uses, so it cannot drift from what ReviewClient opens on — and
  // useItems' seeded cache key cannot end up describing different rows.
  const [batchResult, totalResult, reviewedResult, itemsResult, counts] = await Promise.all([
    supabase.from('auction_batches').select('id, name, imported_at, pin_hash').eq('id', batchId).single(),
    supabase.from('items').select('*', { count: 'exact', head: true }).eq('batch_id', batchId),
    supabase.from('items').select('*', { count: 'exact', head: true }).eq('batch_id', batchId).neq('status', 'pending'),
    applySort(
      applyItemFilters(
        supabase.from('items').select('*', { count: 'exact' }),
        batchId,
        DEFAULT_FILTERS,
      ).range(from, to),
      DEFAULT_FILTERS.sort,
    ),
    getFilterCounts(supabase, batchId, DEFAULT_FILTERS),
  ]);

  if (batchResult.error || !batchResult.data) notFound();
  const batch = batchResult.data;

  // The gate is in the browser, but the rows are rendered here — so a locked
  // batch must not have its items in the HTML at all. They are fetched above
  // (in parallel, off the critical path) and simply never leave the server;
  // ReviewClient refetches them itself once the PIN is entered.
  const unlockedHere = hasBatchAccess(await cookies(), batchId, batch.pin_hash);

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
      initialItems={unlockedHere ? {
        items: (itemsResult.data ?? []) as Item[],
        total: itemsResult.count ?? 0,
        page: 1,
        pageSize: PAGE_SIZE,
      } : null}
      initialCounts={unlockedHere ? counts : null}
    />
  );
}
