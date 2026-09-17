'use client';
import { useState, useEffect, useCallback } from 'react';
import { ItemStatus, ItemsQueryResult } from '@/lib/types';

interface UseItemsOptions {
  batchId: string;
  search: string;
  status: ItemStatus | 'all';
  sort: string;
  page: number;
  /** First page, already fetched on the server. */
  initialData?: ItemsQueryResult | null;
  /** False while the batch is still locked — /api/items would only 401. */
  enabled?: boolean;
}

function queryKey(o: Omit<UseItemsOptions, 'initialData' | 'enabled'>) {
  return `${o.batchId}|${o.search}|${o.status}|${o.sort}|${o.page}`;
}

export function useItems(options: UseItemsOptions) {
  const { batchId, search, status, sort, page, initialData, enabled = true } = options;
  const [data, setData] = useState<ItemsQueryResult | null>(initialData ?? null);

  const key = queryKey(options);
  // Seeded with the view the server already rendered. Refetching that on mount
  // would throw the work away and show a spinner over correct data.
  const [loadedKey, setLoadedKey] = useState<string | null>(initialData ? key : null);
  const loading = enabled && loadedKey !== key;

  const fetchItems = useCallback(async () => {
    const params = new URLSearchParams({ batchId, page: String(page), status, sort });
    if (search) params.set('search', search);
    const res = await fetch(`/api/items?${params}`);
    if (res.ok) setData(await res.json());
    setLoadedKey(queryKey({ batchId, search, status, sort, page }));
  }, [batchId, search, status, sort, page]);

  useEffect(() => {
    if (!enabled || key === loadedKey) return;
    fetchItems();
  }, [enabled, fetchItems, key, loadedKey]);

  return { data, loading, refetch: fetchItems };
}
