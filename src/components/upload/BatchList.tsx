'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuctionBatch } from '@/lib/types';
import PinModal from '@/components/PinModal';
import {
  isBatchVerified, isMasterVerified,
  setBatchVerified, storeVerifiedPin, setMasterVerified,
  getVerifiedPin,
} from '@/lib/session';

type PinModalState = {
  batchId: string;
  batchName: string;
  mode: 'access' | 'delete';
  destination?: string;
} | null;

export default function BatchList() {
  const [batches, setBatches] = useState<AuctionBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [pinModal, setPinModal] = useState<PinModalState>(null);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/batches')
      .then(r => r.json())
      .then((data: AuctionBatch[]) => { setBatches(data); setLoading(false); });
  }, []);

  function handleNavigate(batch: AuctionBatch, destination: string) {
    if (!batch.pin_hash || isBatchVerified(batch.id) || isMasterVerified()) {
      router.push(destination);
      return;
    }
    setPinModal({ batchId: batch.id, batchName: batch.name, mode: 'access', destination });
  }

  async function executeDeletion(batchId: string) {
    setDeleting(batchId);
    const batch = batches.find(b => b.id === batchId);
    const pin = batch?.pin_hash ? (getVerifiedPin(batchId) ?? '') : undefined;
    const res = await fetch(`/api/batches/${batchId}`, {
      method: 'DELETE',
      ...(pin !== undefined
        ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pin }) }
        : {}),
    });
    if (res.ok) {
      setBatches(prev => prev.filter(b => b.id !== batchId));
    }
    setDeleting(null);
  }

  async function handleDelete(batch: AuctionBatch) {
    if (!confirm(`Delete "${batch.name}" and all its items? This cannot be undone.`)) return;
    if (batch.pin_hash && !isBatchVerified(batch.id) && !isMasterVerified()) {
      setPinModal({ batchId: batch.id, batchName: batch.name, mode: 'delete' });
      return;
    }
    await executeDeletion(batch.id);
  }

  function handlePinSuccess(pin: string, isMaster: boolean) {
    if (!pinModal) return;
    const { batchId, mode, destination } = pinModal;
    setBatchVerified(batchId);
    storeVerifiedPin(batchId, pin);
    if (isMaster) setMasterVerified();
    setPinModal(null);
    if (mode === 'access' && destination) {
      router.push(destination);
    } else if (mode === 'delete') {
      executeDeletion(batchId);
    }
  }

  if (loading) return null;
  if (!batches.length) return null;

  return (
    <>
      {pinModal && (
        <PinModal
          batchId={pinModal.batchId}
          batchName={pinModal.batchName}
          mode={pinModal.mode}
          onSuccess={handlePinSuccess}
          onCancel={() => setPinModal(null)}
        />
      )}
      <div className="space-y-3">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Previous Uploads</h2>
        {batches.map(batch => (
          <div key={batch.id} className="bg-gray-800 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="font-medium text-sm truncate">
                {batch.name}
                {batch.pin_hash && <span className="ml-2 text-xs text-gray-500">🔒</span>}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {batch.reviewed_count} / {batch.item_count} reviewed ·{' '}
                {new Date(batch.imported_at).toLocaleDateString()}
              </p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={() => handleNavigate(batch, `/review/${batch.id}`)}
                className="px-3 py-1.5 bg-blue-700 hover:bg-blue-600 rounded-lg text-xs font-medium transition-colors"
              >
                Review
              </button>
              <button
                onClick={() => handleNavigate(batch, `/export/${batch.id}`)}
                className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-xs font-medium transition-colors"
              >
                Export
              </button>
              <button
                onClick={() => handleDelete(batch)}
                disabled={deleting === batch.id}
                className="px-3 py-1.5 bg-red-900 hover:bg-red-700 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleting === batch.id ? '…' : 'Delete'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
