import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const batchId = searchParams.get('batchId');
  const search = searchParams.get('search') ?? '';
  const status = searchParams.get('status') ?? 'all';
  const sort = searchParams.get('sort') ?? 'created_asc';
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const pageSize = 50;

  if (!batchId) {
    return NextResponse.json({ error: 'batchId is required' }, { status: 400 });
  }

  const supabase = getSupabaseServer();
  let query = supabase
    .from('items')
    .select('*', { count: 'exact' })
    .eq('batch_id', batchId);

  if (status !== 'all') query = query.eq('status', status);
  if (search) query = query.or(`title.ilike.%${search}%,sku.ilike.%${search}%`);

  const from = (page - 1) * pageSize;
  const sortMap: Record<string, { column: string; ascending: boolean }> = {
    date_bought_asc:  { column: 'date_bought', ascending: true },
    date_bought_desc: { column: 'date_bought', ascending: false },
    sku_asc:          { column: 'sku',         ascending: true },
    sku_desc:         { column: 'sku',         ascending: false },
  };
  const { column, ascending } = sortMap[sort] ?? sortMap['date_bought_asc'];
  query = query.range(from, from + pageSize - 1).order(column, { ascending });

  const { data, count, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    items: data ?? [],
    total: count ?? 0,
    page,
    pageSize,
  });
}
