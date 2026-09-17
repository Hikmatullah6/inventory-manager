// src/lib/export-route.ts
//
// The four CSV export routes differ only in which builder they call, which
// status they fetch and what the file is named. They share this handler so the
// PIN check cannot be added to some of them and forgotten on the others.
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';
import { fetchAllItems } from '@/lib/csv-export';
import { requireBatchAccess } from '@/lib/batch-access';
import type { Item, ItemStatus } from '@/lib/types';

export function exportFilename(batchName: string, suffix: string, extension: string): string {
  return `${batchName || 'inventory'}-${suffix}.${extension}`.replace(/[^a-z0-9\-_.]/gi, '_');
}

interface CSVExportConfig {
  build: (items: Item[]) => string;
  /** Narrow the query when the CSV only ever contains one status. */
  status?: ItemStatus;
  /** Goes into the filename: `<batch>-<suffix>.csv`. */
  suffix: string;
}

export function csvExportRoute({ build, status, suffix }: CSVExportConfig) {
  return async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ batchId: string }> }
  ) {
    const { batchId } = await params;
    const supabase = getSupabaseServer();

    const access = await requireBatchAccess(req, supabase, batchId);
    if ('denied' in access) return access.denied;

    let items;
    try { items = await fetchAllItems(supabase, batchId, status); }
    catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    return new NextResponse(build(items), {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${exportFilename(access.batch.name, suffix, 'csv')}"`,
      },
    });
  };
}
