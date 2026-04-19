import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';
import { verifyPin } from '@/lib/pin';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = getSupabaseServer();

  const { data: batch, error: fetchError } = await supabase
    .from('auction_batches')
    .select('pin_hash')
    .eq('id', id)
    .single();

  if (fetchError || !batch) {
    return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
  }

  if (batch.pin_hash !== null) {
    let pin = '';
    try {
      const body = await req.json();
      pin = typeof body?.pin === 'string' ? body.pin : '';
    } catch {}
    if (!verifyPin(pin, batch.pin_hash)) {
      return NextResponse.json({ error: 'Incorrect PIN' }, { status: 401 });
    }
  }

  const { error } = await supabase
    .from('auction_batches')
    .delete()
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return new NextResponse(null, { status: 204 });
}
