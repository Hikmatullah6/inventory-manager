import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';
import { fetchAllItems } from '@/lib/csv-export';
import { requireBatchAccess } from '@/lib/batch-access';
import { exportFilename } from '@/lib/export-route';
import { buildQuickExportWorkbook } from '@/lib/xlsx-export';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ batchId: string }> }
) {
  const { batchId } = await params;
  const supabase = getSupabaseServer();

  const access = await requireBatchAccess(req, supabase, batchId);
  if ('denied' in access) return access.denied;

  let items;
  try { items = await fetchAllItems(supabase, batchId); }
  catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  const xlsx = await buildQuickExportWorkbook(items);

  return new NextResponse(new Uint8Array(xlsx), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${exportFilename(access.batch.name, 'quick-export', 'xlsx')}"`,
    },
  });
}
