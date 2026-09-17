import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';
import { verifyPin } from '@/lib/pin';
import { grantBatchAccess } from '@/lib/batch-access';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  let pin = '';
  try {
    const body = await req.json();
    pin = typeof body?.pin === 'string' ? body.pin : '';
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!pin) {
    return NextResponse.json({ error: 'PIN is required' }, { status: 400 });
  }

  const supabase = getSupabaseServer();
  const { data: batch, error } = await supabase
    .from('auction_batches')
    .select('pin_hash')
    .eq('id', id)
    .single();

  if (error || !batch) {
    return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
  }

  if (!verifyPin(pin, batch.pin_hash)) {
    return NextResponse.json({ error: 'Incorrect PIN' }, { status: 401 });
  }

  // The cookie is what lets the export links — plain navigations that carry no
  // header of ours — prove the PIN was entered.
  const isMaster = pin === process.env.MASTER_PIN;
  const res = NextResponse.json({ ok: true, master: isMaster });
  grantBatchAccess(res, id, isMaster);
  return res;
}
