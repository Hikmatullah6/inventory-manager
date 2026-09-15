import UploadZone from '@/components/upload/UploadZone';
import BatchList from '@/components/upload/BatchList';
import { listBatches } from '@/lib/batches';

// Without this Next prerenders the page at build time and the batch list and
// review counts freeze at whatever they were when the app was deployed.
export const dynamic = 'force-dynamic';

export default async function Home() {
  // Fetched here rather than in BatchList's effect: the list arrives with the
  // HTML instead of after a round trip that runs 2 count queries per batch.
  const batches = await listBatches();

  return (
    <main className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-2xl mx-auto px-4 py-12 space-y-10">
        <div>
          <h1 className="text-2xl font-bold">Inventory Manager</h1>
          <p className="text-gray-400 mt-1 text-sm">Upload an auction invoice CSV to get started</p>
        </div>
        <UploadZone />
        <div className="border border-gray-700 rounded-xl px-4 py-3 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium">New here?</p>
            <p className="text-xs text-gray-400 mt-0.5">Download the example CSV to see the expected format — 20 sample products ready to import.</p>
          </div>
          <a
            href="/example-inventory.csv"
            download
            className="flex-shrink-0 px-3 min-h-11 inline-flex items-center bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
          >
            Download Example
          </a>
        </div>
        <BatchList initialBatches={batches} />
      </div>
    </main>
  );
}
