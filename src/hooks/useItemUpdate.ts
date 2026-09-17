'use client';
import { useCallback, useRef } from 'react';
import { Item, ItemUpdate } from '@/lib/types';

export function useItemUpdate(batchId: string, onSuccess?: (item: Item) => void) {
  const inFlight = useRef<Set<string>>(new Set());
  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;

  const updateItem = useCallback(async (id: string, update: ItemUpdate) => {
    if (inFlight.current.has(id)) return;
    inFlight.current.add(id);
    try {
      const res = await fetch(`/api/items/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        // The batch this edit belongs to: it lets the server check the PIN
        // cookie without first looking the item up.
        body: JSON.stringify({ ...update, batch_id: batchId }),
      });
      if (res.ok) {
        const item: Item = await res.json();
        onSuccessRef.current?.(item);
      }
    } finally {
      inFlight.current.delete(id);
    }
  }, [batchId]); // onSuccess is accessed via ref, so only the batch matters

  return { updateItem };
}
