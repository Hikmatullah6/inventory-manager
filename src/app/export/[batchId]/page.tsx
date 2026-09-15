// src/app/export/[batchId]/page.tsx
import { notFound } from 'next/navigation';
import { getSupabaseServer } from '@/lib/supabase-server';
import Link from 'next/link';
import ExportStats from '@/components/export/ExportStats';
import ExportButtons from '@/components/export/ExportButtons';
import PinGate from '@/components/PinGate';
import type { ItemStatus } from '@/lib/types';

const VALID_STATUSES: ItemStatus[] = ['have_it', 'dont_have', 'broken', 'partial', 'pending', 'sold', 'personal_use'];

export default async function ExportPage({ params }: { params: Promise<{ batchId: string }> }) {
  const { batchId } = await params;
  const supabase = getSupabaseServer();

  // Counted, not downloaded. This used to pull every row's status in 1000-row
  // pages just to tally them — four sequential round trips on a 4,000-item
  // batch. These are head-only counts, and they run alongside the batch lookup
  // rather than after it.
  const [batchResult, ...counted] = await Promise.all([
    supabase.from('auction_batches').select('name, pin_hash').eq('id', batchId).single(),
    ...VALID_STATUSES.map(status =>
      supabase
        .from('items')
        .select('*', { count: 'exact', head: true })
        .eq('batch_id', batchId)
        .eq('status', status)
    ),
  ]);

  const batch = batchResult.data;
  if (batchResult.error || !batch) notFound();

  const counts = Object.fromEntries(
    VALID_STATUSES.map((status, i) => [status, counted[i].count ?? 0])
  ) as Record<ItemStatus, number>;
  const total = VALID_STATUSES.reduce((sum, status) => sum + counts[status], 0);

  const exportCount = counts.have_it + counts.broken + counts.partial;

  return (
    <PinGate batchId={batchId} batchName={batch.name} hasPin={batch.pin_hash !== null}>
      <div className="min-h-screen bg-gray-900 text-white">
        <div className="max-w-2xl mx-auto px-4 py-10 space-y-8">
          <div>
            <Link href="/" className="text-gray-400 hover:text-white text-sm min-h-11 inline-flex items-center">← Back</Link>
            <h1 className="text-xl font-bold mt-3">{batch?.name ?? 'Export'}</h1>
            <p className="text-gray-400 text-sm mt-1">Download your inventory as CSV</p>
          </div>
          <ExportStats stats={{ total, ...counts }} />
          <ExportButtons
            batchId={batchId}
            inventoryCount={exportCount}
            soldCount={counts.sold}
            personalUseCount={counts.personal_use}
          />
        </div>
      </div>
    </PinGate>
  );
}
