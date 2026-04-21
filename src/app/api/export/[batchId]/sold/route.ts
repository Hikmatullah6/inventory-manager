import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';
import { buildSoldCSV } from '@/lib/csv-export';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ batchId: string }> }
) {
  const { batchId } = await params;
  const supabase = getSupabaseServer();

  const { data: batch } = await supabase
    .from('auction_batches')
    .select('name')
    .eq('id', batchId)
    .single();

  const { data: items, error } = await supabase
    .from('items')
    .select('*')
    .eq('batch_id', batchId)
    .eq('status', 'sold')
    .order('created_at', { ascending: true })
    .limit(5000);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const csv = buildSoldCSV(items ?? []);
  const filename = `${batch?.name ?? 'inventory'}-sold.csv`
    .replace(/[^a-z0-9\-_.]/gi, '_');

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
