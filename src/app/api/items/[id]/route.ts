import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';
import { denyUnlessBatchAccess, hasBatchCookie } from '@/lib/batch-access';
import { pickItemUpdate } from '@/lib/item-update';
import { ItemUpdate } from '@/lib/types';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const claimedBatchId = typeof body.batch_id === 'string' ? body.batch_id : undefined;

  // Only allow-listed fields reach Postgres, each coerced to its column's shape.
  // Without this the body's keys went straight through, so any column in the row
  // was writable — including batch_id's siblings and created_at.
  const picked = pickItemUpdate(body);
  if ('error' in picked) {
    return NextResponse.json({ error: picked.error }, { status: 400 });
  }

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
    ...picked.update,
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
