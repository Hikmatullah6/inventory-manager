'use client';
import { useState, useEffect, useCallback } from 'react';
import { Item, ItemStatus, ItemsQueryResult } from '@/lib/types';

interface UseItemsOptions {
  batchId: string;
  search: string;
  status: ItemStatus | 'all';
  page: number;
}

export function useItems({ batchId, search, status, page }: UseItemsOptions) {
  const [data, setData] = useState<ItemsQueryResult | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ batchId, page: String(page), status });
    if (search) params.set('search', search);
    const res = await fetch(`/api/items?${params}`);
    if (res.ok) {
      const json = await res.json();
      setData(json);
    }
    setLoading(false);
  }, [batchId, search, status, page]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  return { data, loading, refetch: fetchItems };
}
