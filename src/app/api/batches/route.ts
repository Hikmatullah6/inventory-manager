import { NextResponse } from 'next/server';
import { listBatches } from '@/lib/batches';

export async function GET() {
  try {
    return NextResponse.json(await listBatches());
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not load batches';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
