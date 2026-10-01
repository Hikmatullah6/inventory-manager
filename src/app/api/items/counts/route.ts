import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';
import { getStatusCounts } from '@/lib/item-counts';
import { denyUnlessBatchAccess } from '@/lib/batch-access';
import { parseItemFilters } from '@/lib/item-query';

/** Feeds the counts on the mobile status filter chips. */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const batchId = searchParams.get('batchId');

  if (!batchId) {
    return NextResponse.json({ error: 'batchId is required' }, { status: 400 });
  }

  const supabase = getSupabaseServer();
  const denied = await denyUnlessBatchAccess(req, supabase, batchId);
  if (denied) return denied;

  try {
    // The caller's `status`, `sort` and `page` are parsed but ignored by
    // getStatusCounts: it fixes the status per chip and counts the whole batch.
    const filters = parseItemFilters(searchParams);
    return NextResponse.json(await getStatusCounts(supabase, batchId, filters));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not count items';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
