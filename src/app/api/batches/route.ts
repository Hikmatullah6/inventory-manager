import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';

export async function GET() {
  const supabase = getSupabaseServer();

  const { data: batches, error } = await supabase
    .from('auction_batches')
    .select('id, name, imported_at, pin_hash')
    .order('imported_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const enriched = await Promise.all((batches ?? []).map(async (batch) => {
    const [{ count: total }, { count: reviewed }] = await Promise.all([
      supabase
        .from('items')
        .select('*', { count: 'exact', head: true })
        .eq('batch_id', batch.id),
      supabase
        .from('items')
        .select('*', { count: 'exact', head: true })
        .eq('batch_id', batch.id)
        .neq('status', 'pending'),
    ]);

    return {
      id: batch.id,
      name: batch.name,
      imported_at: batch.imported_at,
      pin_hash: batch.pin_hash ?? null,
      item_count: total ?? 0,
      reviewed_count: reviewed ?? 0,
    };
  }));

  return NextResponse.json(enriched);
}
