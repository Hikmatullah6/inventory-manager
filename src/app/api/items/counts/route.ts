import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';
import { getStatusCounts } from '@/lib/item-counts';

/** Feeds the counts on the mobile status filter chips. */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const batchId = searchParams.get('batchId');
  const search = searchParams.get('search') ?? '';

  if (!batchId) {
    return NextResponse.json({ error: 'batchId is required' }, { status: 400 });
  }

  try {
    return NextResponse.json(await getStatusCounts(getSupabaseServer(), batchId, search));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not count items';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
