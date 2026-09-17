import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';
import { getStatusCounts } from '@/lib/item-counts';
import { denyUnlessBatchAccess } from '@/lib/batch-access';

/** Feeds the counts on the mobile status filter chips. */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const batchId = searchParams.get('batchId');
  const search = searchParams.get('search') ?? '';

  if (!batchId) {
    return NextResponse.json({ error: 'batchId is required' }, { status: 400 });
  }

  const supabase = getSupabaseServer();
  const denied = await denyUnlessBatchAccess(req, supabase, batchId);
  if (denied) return denied;

  try {
    return NextResponse.json(await getStatusCounts(supabase, batchId, search));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not count items';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
