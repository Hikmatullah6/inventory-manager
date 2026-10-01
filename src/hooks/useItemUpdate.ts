'use client';
import { useCallback, useEffect, useRef } from 'react';
import { Item, ItemUpdate } from '@/lib/types';

/**
 * Commit one field (or a few) of one item.
 *
 * Writes to the same item are serialised rather than dropped. Each item's
 * pending writes are chained onto one promise, so a blur followed immediately by
 * a status tap sends both in order instead of silently losing the second — which
 * is what the previous in-flight guard did, and which matters much more now that
 * fourteen fields are editable rather than six.
 */
export function useItemUpdate(batchId: string, onSuccess?: (item: Item) => void) {
  /** Per item: the tail of its write chain. */
  const queues = useRef<Map<string, Promise<void>>>(new Map());

  // Held in a ref so a new callback identity does not bust the useCallback below
  // and restart every consumer. Synced in an effect rather than during render —
  // writing a ref while rendering is not safe under concurrent rendering, and
  // updateItem only ever runs from an event handler, long after this has run.
  const onSuccessRef = useRef(onSuccess);
  useEffect(() => {
    onSuccessRef.current = onSuccess;
  });

  const updateItem = useCallback((id: string, update: ItemUpdate) => {
    const send = async () => {
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
    };

    // A rejected link must not break the chain for later writes.
    const next = (queues.current.get(id) ?? Promise.resolve())
      .then(send, send)
      .catch(() => {});

    queues.current.set(id, next);
    // Let the map shrink once this item has gone quiet.
    next.finally(() => {
      if (queues.current.get(id) === next) queues.current.delete(id);
    });

    return next;
  }, [batchId]); // onSuccess is accessed via ref, so only the batch matters

  return { updateItem };
}
