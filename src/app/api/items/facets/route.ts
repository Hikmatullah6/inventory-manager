import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';
import { getItemFacets } from '@/lib/item-facets';
import { denyUnlessBatchAccess } from '@/lib/batch-access';

/** Distinct values for the category / subcategory / tag / season pickers. */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const batchId = searchParams.get('batchId');

  if (!batchId) {
    return NextResponse.json({ error: 'batchId is required' }, { status: 400 });
  }

  const supabase = getSupabaseServer();
  const denied = await denyUnlessBatchAccess(req, supabase, batchId);
  if (denied) return denied;

  return NextResponse.json(await getItemFacets(supabase, batchId));
}
