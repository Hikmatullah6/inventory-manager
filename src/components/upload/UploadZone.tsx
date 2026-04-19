'use client';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { setBatchVerified, storeVerifiedPin } from '@/lib/session';

export default function UploadZone() {
  const [dragging, setDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [batchName, setBatchName] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    imported: number;
    skipped: number;
    duplicateSKUs: string[];
  } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  function selectFile(file: File) {
    if (!file.name.endsWith('.csv')) {
      setError('Please select a CSV file');
      return;
    }
    setSelectedFile(file);
    setError(null);
    setResult(null);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) selectFile(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFile) return;

    setLoading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('name', batchName || selectedFile.name.replace('.csv', ''));
    formData.append('pin', pin);

    const res = await fetch('/api/upload', { method: 'POST', body: formData });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? 'Upload failed');
      setLoading(false);
      return;
    }

    if (pin.length === 4 && data.batch?.id) {
      setBatchVerified(data.batch.id);
      storeVerifiedPin(data.batch.id, pin);
    }
    setResult({ imported: data.imported, skipped: data.skipped, duplicateSKUs: data.duplicateSKUs });
    setSelectedFile(null);
    setBatchName('');
    setPin('');
    setLoading(false);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors
          ${dragging ? 'border-blue-400 bg-blue-950' : selectedFile ? 'border-green-600 bg-green-950/30' : 'border-gray-600 hover:border-gray-400'}`}
        onClick={() => fileRef.current?.click()}
      >
        <div className="text-3xl mb-2">{selectedFile ? '✅' : '📁'}</div>
        {selectedFile ? (
          <p className="text-green-300 text-sm font-medium">{selectedFile.name}</p>
        ) : (
          <p className="text-gray-400 text-sm mb-3">Drop your auction CSV here or click to browse</p>
        )}
        <input
          ref={fileRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) selectFile(f); }}
        />
        <button
          type="button"
          className="mt-2 px-4 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-xs"
          onClick={e => { e.stopPropagation(); fileRef.current?.click(); }}
        >
          {selectedFile ? 'Change File' : 'Choose File'}
        </button>
      </div>

      <div className="flex items-center gap-3">
        <label className="text-sm text-gray-400 whitespace-nowrap w-20">Name:</label>
        <input
          type="text"
          value={batchName}
          onChange={e => setBatchName(e.target.value)}
          placeholder="e.g. April Auction – BidSpotter (optional)"
          className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
        />
      </div>

      <div className="flex items-center gap-3">
        <label className="text-sm text-gray-400 whitespace-nowrap w-20">PIN:</label>
        <div className="flex-1 flex flex-col gap-1">
          <input
            type="password"
            value={pin}
            onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
            placeholder="4-digit PIN (optional)"
            maxLength={4}
            inputMode="numeric"
            className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
          />
          <p className="text-xs text-gray-500">Leave blank for no PIN protection</p>
        </div>
      </div>

      <button
        type="submit"
        disabled={!selectedFile || loading}
        className="w-full py-2.5 bg-blue-700 hover:bg-blue-600 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-xl text-sm font-medium transition-colors"
      >
        {loading ? 'Importing…' : 'Submit'}
      </button>

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
    </form>
  );
}
