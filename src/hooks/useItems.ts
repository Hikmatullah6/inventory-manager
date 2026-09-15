'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { ItemStatus, ItemsQueryResult } from '@/lib/types';

interface UseItemsOptions {
  batchId: string;
  search: string;
  status: ItemStatus | 'all';
  sort: string;
  page: number;
  /** First page, already fetched on the server. */
  initialData?: ItemsQueryResult | null;
}

function queryKey(o: Omit<UseItemsOptions, 'initialData'>) {
  return `${o.batchId}|${o.search}|${o.status}|${o.sort}|${o.page}`;
}

export function useItems(options: UseItemsOptions) {
  const { batchId, search, status, sort, page, initialData } = options;
  const [data, setData] = useState<ItemsQueryResult | null>(initialData ?? null);

  // The view the server already rendered. Refetching it on mount would throw
  // away that work and show a spinner over data that is already correct.
  const seededKey = useRef(initialData ? queryKey(options) : null);
  const key = queryKey(options);
  const [loadedKey, setLoadedKey] = useState<string | null>(seededKey.current);
  const loading = loadedKey !== key;

  const fetchItems = useCallback(async () => {
    const params = new URLSearchParams({ batchId, page: String(page), status, sort });
    if (search) params.set('search', search);
    const res = await fetch(`/api/items?${params}`);
    if (res.ok) setData(await res.json());
    setLoadedKey(queryKey({ batchId, search, status, sort, page }));
  }, [batchId, search, status, sort, page]);

  useEffect(() => {
    if (key === seededKey.current) return;
    fetchItems();
  }, [fetchItems, key]);

  return { data, loading, refetch: fetchItems };
}
