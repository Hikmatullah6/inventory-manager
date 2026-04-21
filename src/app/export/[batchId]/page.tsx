// src/app/export/[batchId]/page.tsx
import { notFound } from 'next/navigation';
import { getSupabaseServer } from '@/lib/supabase-server';
import Link from 'next/link';
import ExportStats from '@/components/export/ExportStats';
import ExportButtons from '@/components/export/ExportButtons';
import PinGate from '@/components/PinGate';
import type { ItemStatus } from '@/lib/types';

export default async function ExportPage({ params }: { params: Promise<{ batchId: string }> }) {
  const { batchId } = await params;
  const supabase = getSupabaseServer();

  const { data: batch, error: batchError } = await supabase
    .from('auction_batches')
    .select('name, pin_hash')
    .eq('id', batchId)
    .single();

  if (batchError || !batch) notFound();

  const pageSize = 1000;
  const allStatuses: { status: string }[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from('items')
      .select('status')
      .eq('batch_id', batchId)
      .range(from, from + pageSize - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    allStatuses.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }

  const items = allStatuses;
  const VALID_STATUSES = new Set<string>(['have_it', 'dont_have', 'broken', 'partial', 'pending', 'sold', 'personal_use']);

  const counts = (items ?? []).reduce(
    (acc, item) => {
      acc.total++;
      if (VALID_STATUSES.has(item.status)) {
        acc[item.status as ItemStatus]++;
      }
      return acc;
    },
    { total: 0, have_it: 0, dont_have: 0, broken: 0, partial: 0, pending: 0, sold: 0, personal_use: 0 } as { total: number } & Record<ItemStatus, number>
  );

  const exportCount = counts.have_it + counts.broken + counts.partial;

  return (
    <PinGate batchId={batchId} batchName={batch.name} pinHash={batch.pin_hash ?? null}>
      <div className="min-h-screen bg-gray-900 text-white">
        <div className="max-w-2xl mx-auto px-4 py-10 space-y-8">
          <div>
            <Link href="/" className="text-gray-400 hover:text-white text-sm">← Back</Link>
            <h1 className="text-xl font-bold mt-3">{batch?.name ?? 'Export'}</h1>
            <p className="text-gray-400 text-sm mt-1">Download your inventory as CSV</p>
          </div>
          <ExportStats stats={counts} />
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
