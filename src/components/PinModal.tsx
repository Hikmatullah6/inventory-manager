'use client';
import { useState, useRef, useEffect } from 'react';

export interface PinModalProps {
  batchId: string;
  batchName: string;
  mode: 'access' | 'delete';
  onSuccess: (pin: string, isMaster: boolean) => void;
  onCancel: () => void;
}

export default function PinModal({ batchId, batchName, mode, onSuccess, onCancel }: PinModalProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onCancel]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pin.length !== 4) { setError('Enter a 4-digit PIN'); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/batches/${batchId}/verify-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        onSuccess(pin, data.master === true);
        return;
      }
      setError(data.error ?? 'Incorrect PIN');
      setPin('');
      inputRef.current?.focus();
    } catch {
      setError('Network error, please try again');
    } finally {
      setLoading(false);
    }
  }

  const title = mode === 'delete' ? `Delete "${batchName}"` : `Access "${batchName}"`;
  const buttonLabel = mode === 'delete' ? 'Confirm Delete' : 'Unlock';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-xs shadow-2xl">
        <h2 className="text-base font-semibold mb-1">{title}</h2>
        <p className="text-sm text-gray-400 mb-4">Enter the 4-digit PIN to continue</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            ref={inputRef}
            type="password"
            value={pin}
            onChange={e => { setPin(e.target.value.replace(/\D/g, '').slice(0, 4)); setError(null); }}
            placeholder="••••"
            maxLength={4}
            inputMode="numeric"
            disabled={loading}
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-center text-xl tracking-[0.5em] focus:outline-none focus:border-blue-400 disabled:opacity-50"
          />
          {error && <p className="text-red-400 text-xs text-center">{error}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || pin.length !== 4}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed
                ${mode === 'delete'
                  ? 'bg-red-700 hover:bg-red-600'
                  : 'bg-blue-700 hover:bg-blue-600'
                }`}
            >
              {loading ? '…' : buttonLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
