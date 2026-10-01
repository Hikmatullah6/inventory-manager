// src/components/export/ExportButtons.tsx
'use client';

import { useRef, useState } from 'react';
import PinModal from '@/components/PinModal';
import { STATUS_SHORT } from '@/lib/item-status';
import { EXPORT_SHEET_ORDER } from '@/lib/xlsx-export';
import type { ItemStatus } from '@/lib/types';

interface Props {
  batchId: string;
  batchName: string;
  hasPin: boolean;
  /** Per-status totals, to show which sheets the workbook will contain. */
  counts: Record<ItemStatus, number>;
}

export default function ExportButtons({ batchId, batchName, hasPin, counts }: Props) {
  const [pinOpen, setPinOpen] = useState(false);
  const anchor = useRef<HTMLAnchorElement>(null);
  const url = `/api/export/${batchId}/workbook`;

  const sheets = EXPORT_SHEET_ORDER.filter(status => counts[status] > 0);
  const total = EXPORT_SHEET_ORDER.reduce((sum, status) => sum + counts[status], 0);

  function startDownload() {
    // Clicking a real anchor rather than fetch + Blob or router.push: this is a
    // file download, not a page. Content-Disposition keeps the page loaded, a few
    // thousand rows are never buffered in the browser, and requireBatchAccess'
    // plain-text 401 stays readable if the cookie somehow is not there.
    anchor.current?.click();
  }

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => (hasPin ? setPinOpen(true) : startDownload())}
        className="w-full flex items-center justify-between gap-3 bg-blue-700 hover:bg-blue-600
          rounded-xl px-5 py-4 min-h-11 text-left transition-colors"
      >
        <div className="min-w-0">
          <p className="font-semibold text-sm">Download Excel workbook</p>
          <p className="text-sm text-blue-200 mt-0.5">
            {total} item{total === 1 ? '' : 's'} · the same 18 columns as your import sheet
          </p>
        </div>
        <span className="flex-none text-blue-200 text-lg">↓</span>
      </button>

      <div className="bg-gray-800 rounded-xl p-4 space-y-3">
        <p className="text-sm text-gray-400">
          One sheet per status, in this order. Empty statuses are left out.
        </p>
        {sheets.length > 0 ? (
          <ul className="space-y-1.5">
            {sheets.map(status => (
              <li key={status} className="flex items-center justify-between text-sm">
                <span>{STATUS_SHORT[status]}</span>
                <span className="text-gray-400">{counts[status]}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500">Nothing to export yet.</p>
        )}
        {hasPin && (
          <p className="text-sm text-gray-500 pt-1 border-t border-gray-700">
            You will be asked for the batch PIN before the file downloads.
          </p>
        )}
      </div>

      {/* The element the PIN flow clicks once verify-pin has returned. */}
      <a ref={anchor} href={url} className="hidden" aria-hidden tabIndex={-1} />

      {pinOpen && (
        <PinModal
          batchId={batchId}
          batchName={batchName}
          mode="export"
          onSuccess={() => { setPinOpen(false); startDownload(); }}
          onCancel={() => setPinOpen(false)}
        />
      )}
    </div>
  );
}
