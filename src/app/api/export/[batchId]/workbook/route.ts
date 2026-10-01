import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';
import { requireBatchAccess } from '@/lib/batch-access';
import { fetchAllItemsForExport } from '@/lib/item-query';
import { buildExportWorkbook, exportFilename } from '@/lib/xlsx-export';

/** The whole batch: 18 import columns, one sheet per status. */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ batchId: string }> }
) {
  const { batchId } = await params;
  const supabase = getSupabaseServer();

  const access = await requireBatchAccess(req, supabase, batchId);
  if ('denied' in access) return access.denied;

  let items;
  try { items = await fetchAllItemsForExport(supabase, batchId); }
  catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  const xlsx = await buildExportWorkbook(items);

  return new NextResponse(new Uint8Array(xlsx), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${exportFilename(access.batch.name, 'export', 'xlsx')}"`,
    },
  });
}
