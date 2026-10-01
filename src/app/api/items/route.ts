import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';
import { denyUnlessBatchAccess } from '@/lib/batch-access';
import { applyItemFilters, applySort, pageRange, parseItemFilters, PAGE_SIZE } from '@/lib/item-query';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const batchId = searchParams.get('batchId');

  if (!batchId) {
    return NextResponse.json({ error: 'batchId is required' }, { status: 400 });
  }

  const supabase = getSupabaseServer();

  const denied = await denyUnlessBatchAccess(req, supabase, batchId);
  if (denied) return denied;

  // Filters, the search escaping and the sort whitelist all live in
  // lib/item-query so this route, the count queries and the server-rendered
  // first page cannot disagree about what the list contains.
  const filters = parseItemFilters(searchParams);
  const [from, to] = pageRange(filters.page);

  const query = applySort(
    applyItemFilters(
      supabase.from('items').select('*', { count: 'exact' }),
      batchId,
      filters,
    ).range(from, to),
    filters.sort,
  );

  const { data, count, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    items: data ?? [],
    total: count ?? 0,
    page: filters.page,
    pageSize: PAGE_SIZE,
  });
}
