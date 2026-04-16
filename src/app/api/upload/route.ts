import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';
import { parseAuctionCSV } from '@/lib/csv-parser';

export async function POST(req: NextRequest) {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'Server misconfiguration: Supabase environment variables are not set.' },
        { status: 500 }
      );
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const name = ((formData.get('name') as string) || '').trim() || 'Unnamed Batch';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const text = await file.text();
    const { rows, errors, duplicateSKUs } = parseAuctionCSV(text);

    // Blocking error (missing required columns or empty CSV)
    if (errors.some(e => e.row === 0)) {
      return NextResponse.json({ error: errors[0].message, errors }, { status: 422 });
    }

    if (rows.length === 0) {
      return NextResponse.json({ error: 'No valid rows found in CSV' }, { status: 422 });
    }

    const supabase = getSupabaseServer();

    const { data: batch, error: batchError } = await supabase
      .from('auction_batches')
      .insert({ name })
      .select()
      .single();

    if (batchError || !batch) {
      return NextResponse.json(
        { error: `Failed to create batch: ${batchError?.message ?? 'unknown error'}` },
        { status: 500 }
      );
    }

    const itemsToInsert = rows.map(row => ({
      ...row,
      batch_id: batch.id,
      status: 'pending',
      qty_sold: 0,
    }));

    const { error: itemsError } = await supabase
      .from('items')
      .insert(itemsToInsert);

    if (itemsError) {
      // Roll back: delete the batch (items cascade)
      await supabase.from('auction_batches').delete().eq('id', batch.id);
      return NextResponse.json({ error: `Failed to insert items: ${itemsError.message}` }, { status: 500 });
    }

    return NextResponse.json({
      batch,
      imported: rows.length,
      skipped: errors.filter(e => e.row > 0).length,
      errors: errors.filter(e => e.row > 0),
      duplicateSKUs,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Unexpected server error: ${message}` }, { status: 500 });
  }
}
