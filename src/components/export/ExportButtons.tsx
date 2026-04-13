// src/components/export/ExportButtons.tsx
'use client';

interface Props {
  batchId: string;
  exportCount: number;
}

export default function ExportButtons({ batchId, exportCount }: Props) {
  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-400">
        {exportCount} items will be exported (excludes &quot;Don&apos;t Have&quot; and unreviewed)
      </p>
      <div className="grid sm:grid-cols-2 gap-3">
        <a
          href={`/api/export/${batchId}/internal`}
          className="flex items-center justify-between bg-gray-700 hover:bg-gray-600 rounded-xl px-5 py-4 transition-colors"
        >
          <div>
            <p className="font-semibold text-sm">📄 Internal CSV</p>
            <p className="text-xs text-gray-400 mt-0.5">All fields · your full record</p>
          </div>
          <span className="text-gray-400 text-lg">↓</span>
        </a>
        <a
          href={`/api/export/${batchId}/shopify`}
          className="flex items-center justify-between bg-green-800 hover:bg-green-700 rounded-xl px-5 py-4 transition-colors"
        >
          <div>
            <p className="font-semibold text-sm">🛍 Shopify CSV</p>
            <p className="text-xs text-green-300 mt-0.5">Shopify columns · ready to import</p>
          </div>
          <span className="text-green-300 text-lg">↓</span>
        </a>
      </div>
    </div>
  );
}
