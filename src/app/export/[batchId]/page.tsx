// src/app/export/[batchId]/page.tsx
import { notFound } from 'next/navigation';
import { getSupabaseServer } from '@/lib/supabase-server';
import Link from 'next/link';
import ExportStats from '@/components/export/ExportStats';
import ExportButtons from '@/components/export/ExportButtons';

export default async function ExportPage({ params }: { params: Promise<{ batchId: string }> }) {
  const { batchId } = await params;
  const supabase = getSupabaseServer();

  const { data: batch, error: batchError } = await supabase
    .from('auction_batches')
    .select('name')
    .eq('id', batchId)
    .single();

  if (batchError || !batch) notFound();

  const { data: items, error: itemsError } = await supabase
    .from('items')
    .select('status')
    .eq('batch_id', batchId);

  if (itemsError) throw itemsError;

  const counts = (items ?? []).reduce(
    (acc, item) => {
      acc.total++;
      const key = item.status as string;
      if (key === 'have_it' || key === 'dont_have' || key === 'broken' || key === 'partial' || key === 'pending') {
        acc[key as 'have_it' | 'dont_have' | 'broken' | 'partial' | 'pending']++;
      }
      return acc;
    },
    { total: 0, have_it: 0, dont_have: 0, broken: 0, partial: 0, pending: 0 }
  );

  const exportCount = counts.have_it + counts.broken + counts.partial;

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-2xl mx-auto px-4 py-10 space-y-8">
        <div>
          <Link href="/" className="text-gray-400 hover:text-white text-sm">← Back</Link>
          <h1 className="text-xl font-bold mt-3">{batch?.name ?? 'Export'}</h1>
          <p className="text-gray-400 text-sm mt-1">Download your inventory as CSV</p>
        </div>
        <ExportStats stats={counts} />
        <ExportButtons batchId={batchId} exportCount={exportCount} />
        <div className="text-xs text-gray-500 border-t border-gray-700 pt-4">
          <p>💡 The Shopify CSV leaves the Price column blank. Fill it in before importing to Shopify.</p>
        </div>
      </div>
    </div>
  );
}
