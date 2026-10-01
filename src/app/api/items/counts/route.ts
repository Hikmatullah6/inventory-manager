import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';
import { getFilterCounts } from '@/lib/filter-counts';
import { denyUnlessBatchAccess } from '@/lib/batch-access';
import { parseItemFilters } from '@/lib/item-query';

/**
 * Every number the filter UI shows: the status chip totals and a count for each
 * category / subcategory / tag / season / month / day option.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const batchId = searchParams.get('batchId');

  if (!batchId) {
    return NextResponse.json({ error: 'batchId is required' }, { status: 400 });
  }

  const supabase = getSupabaseServer();
  const denied = await denyUnlessBatchAccess(req, supabase, batchId);
  if (denied) return denied;

  // `sort` and `page` are parsed but irrelevant — neither can change a total.
  const filters = parseItemFilters(searchParams);
  return NextResponse.json(await getFilterCounts(supabase, batchId, filters));
}
