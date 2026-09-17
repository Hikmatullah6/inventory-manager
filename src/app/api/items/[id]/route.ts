import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';
import { denyUnlessBatchAccess, hasBatchCookie } from '@/lib/batch-access';
import { ItemUpdate } from '@/lib/types';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { batch_id: claimedBatchId, ...fields }: ItemUpdate & { batch_id?: string } =
    await req.json();
  const supabase = getSupabaseServer();

  // Reviewing is a tap on a phone, so the usual path must stay one round trip:
  // the client names the batch it is reviewing and we accept it only against a
  // cookie for that same batch. The update is then scoped to it, so a claimed
  // batch id can never reach an item that does not belong to it.
  let batchId = claimedBatchId;
  if (!batchId || !hasBatchCookie(req.cookies, batchId)) {
    const { data: item } = await supabase
      .from('items')
      .select('batch_id')
      .eq('id', id)
      .single();
    if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    batchId = item.batch_id as string;

    const denied = await denyUnlessBatchAccess(req, supabase, batchId);
    if (denied) return denied;
  }

  const update: ItemUpdate = {
    ...fields,
    reviewed_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('items')
    .update(update)
    .eq('id', id)
    .eq('batch_id', batchId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Item not found' }, { status: 404 });

  return NextResponse.json(data);
}
