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
        <BatchList />
      </div>
    </main>
  );
}
