'use client';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

export default function UploadZone() {
  const [dragging, setDragging] = useState(false);
  const [batchName, setBatchName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    imported: number;
    skipped: number;
    duplicateSKUs: string[];
  } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function uploadFile(file: File) {
    setLoading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', batchName || file.name.replace('.csv', ''));

    const res = await fetch('/api/upload', { method: 'POST', body: formData });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? 'Upload failed');
      setLoading(false);
      return;
    }

    setResult({ imported: data.imported, skipped: data.skipped, duplicateSKUs: data.duplicateSKUs });
    setLoading(false);
    router.refresh();
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file?.name.endsWith('.csv')) uploadFile(file);
  }

  return (
    <div className="space-y-4">
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors
          ${dragging ? 'border-blue-400 bg-blue-950' : 'border-gray-600 hover:border-gray-400'}`}
        onClick={() => fileRef.current?.click()}
      >
        <div className="text-4xl mb-3">📁</div>
        <p className="text-gray-400 mb-4">Drop your auction CSV here or click to browse</p>
        <input
          ref={fileRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) uploadFile(f); }}
        />
        <button
          type="button"
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm"
          onClick={e => { e.stopPropagation(); fileRef.current?.click(); }}
        >
          Choose File
        </button>
      </div>

      <div className="flex items-center gap-3">
        <label className="text-sm text-gray-400 whitespace-nowrap">Batch name:</label>
        <input
          type="text"
          value={batchName}
          onChange={e => setBatchName(e.target.value)}
          placeholder="e.g. April Auction - BidSpotter"
          className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
        />
      </div>

      {loading && <p className="text-blue-400 text-sm">Importing...</p>}

      {error && (
        <div className="bg-red-950 border border-red-700 rounded-lg p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {result && (
        <div className="bg-green-950 border border-green-700 rounded-lg p-3 text-sm text-green-300 space-y-1">
          <p>Imported {result.imported} items{result.skipped > 0 ? `, ${result.skipped} skipped` : ''}</p>
          {result.duplicateSKUs.length > 0 && (
            <p className="text-yellow-300">Duplicate SKUs in this batch: {result.duplicateSKUs.join(', ')}</p>
          )}
        </div>
      )}
    </div>
  );
}
