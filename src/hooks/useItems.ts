'use client';
import { useState, useEffect, useCallback } from 'react';
import { ItemsQueryResult } from '@/lib/types';
import { filtersToParams, type ItemFilters } from '@/lib/item-query';

interface UseItemsOptions {
  batchId: string;
  filters: ItemFilters;
  /** First page, already fetched on the server. */
  initialData?: ItemsQueryResult | null;
  /** False while the batch is still locked — /api/items would only 401. */
  enabled?: boolean;
}

/** One string per distinct result set. Built from the same params the fetch sends. */
function queryKey(batchId: string, filters: ItemFilters) {
  return filtersToParams(batchId, filters).toString();
}

export function useItems({ batchId, filters, initialData, enabled = true }: UseItemsOptions) {
  const [data, setData] = useState<ItemsQueryResult | null>(initialData ?? null);

  const key = queryKey(batchId, filters);
  // Seeded with the view the server already rendered. Refetching that on mount
  // would throw the work away and show a spinner over correct data.
  const [loadedKey, setLoadedKey] = useState<string | null>(initialData ? key : null);
  const loading = enabled && loadedKey !== key;

  const fetchItems = useCallback(async () => {
    const params = filtersToParams(batchId, filters);
    const res = await fetch(`/api/items?${params}`);
    if (res.ok) setData(await res.json());
    setLoadedKey(params.toString());
  }, [batchId, filters]);

  useEffect(() => {
    if (!enabled || key === loadedKey) return;
    fetchItems();
  }, [enabled, fetchItems, key, loadedKey]);

  return { data, loading, refetch: fetchItems };
}
