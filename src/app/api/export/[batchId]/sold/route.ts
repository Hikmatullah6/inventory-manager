import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';
import { buildSoldCSV, fetchAllItems } from '@/lib/csv-export';

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

  let items;
  try { items = await fetchAllItems(supabase, batchId, 'sold'); }
  catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  const csv = buildSoldCSV(items);
  const filename = `${batch?.name ?? 'inventory'}-sold.csv`
    .replace(/[^a-z0-9\-_.]/gi, '_');

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
