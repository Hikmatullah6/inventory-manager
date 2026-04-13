'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AuctionBatch } from '@/lib/types';

export default function BatchList() {
  const [batches, setBatches] = useState<AuctionBatch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/batches')
      .then(r => r.json())
      .then((data: AuctionBatch[]) => { setBatches(data); setLoading(false); });
  }, []);

  if (loading) return null;
  if (!batches.length) return null;

  return (
    <div className="space-y-3">
      <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Previous Uploads</h2>
      {batches.map(batch => (
        <div key={batch.id} className="bg-gray-800 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-medium text-sm truncate">{batch.name}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {batch.reviewed_count} / {batch.item_count} reviewed ·{' '}
              {new Date(batch.imported_at).toLocaleDateString()}
            </p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Link
              href={`/review/${batch.id}`}
              className="px-3 py-1.5 bg-blue-700 hover:bg-blue-600 rounded-lg text-xs font-medium transition-colors"
            >
              Review
            </Link>
            <Link
              href={`/export/${batch.id}`}
              className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-xs font-medium transition-colors"
            >
              Export
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}
