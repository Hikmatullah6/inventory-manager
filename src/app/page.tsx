import UploadZone from '@/components/upload/UploadZone';
import BatchList from '@/components/upload/BatchList';

export default function Home() {
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
            className="flex-shrink-0 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-xs font-medium transition-colors whitespace-nowrap"
          >
            Download Example
          </a>
        </div>
        <BatchList />
      </div>
    </main>
  );
}
