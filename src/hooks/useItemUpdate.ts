'use client';
import { useCallback, useRef } from 'react';
import { Item, ItemUpdate } from '@/lib/types';

export function useItemUpdate(onSuccess?: (item: Item) => void) {
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
        body: JSON.stringify(update),
      });
      if (res.ok) {
        const item: Item = await res.json();
        onSuccessRef.current?.(item);
      }
    } finally {
      inFlight.current.delete(id);
    }
  }, []); // stable — no deps, onSuccess accessed via ref

  return { updateItem };
}
