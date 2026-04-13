import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';
import { ItemUpdate } from '@/lib/types';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body: ItemUpdate = await req.json();
  const supabase = getSupabaseServer();

  const update: ItemUpdate = {
    ...body,
    reviewed_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('items')
    .update(update)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Item not found' }, { status: 404 });

  return NextResponse.json(data);
}
