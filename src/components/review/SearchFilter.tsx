'use client';
import { useEffect, useState } from 'react';
import { ItemStatus } from '@/lib/types';

const STATUS_OPTIONS: { value: ItemStatus | 'all'; label: string }[] = [
  { value: 'all',          label: 'All'           },
  { value: 'pending',      label: '⏳ Pending'    },
  { value: 'have_it',      label: '✓ Have It'     },
  { value: 'dont_have',    label: "✗ Don't Have"  },
  { value: 'broken',       label: '⚠ Broken'      },
  { value: 'partial',      label: '⅟ Partial'     },
  { value: 'sold',         label: '$ Sold'        },
  { value: 'personal_use', label: '♥ Personal Use' },
];

const SORT_OPTIONS = [
  { value: 'date_bought_asc',  label: 'Date Bought ↑' },
  { value: 'date_bought_desc', label: 'Date Bought ↓' },
  { value: 'sku_asc',          label: 'SKU ↑' },
  { value: 'sku_desc',         label: 'SKU ↓' },
];

interface Props {
  onSearch: (q: string) => void;
  onStatus: (s: ItemStatus | 'all') => void;
  status: ItemStatus | 'all';
  sort: string;
  onSort: (s: string) => void;
}

export default function SearchFilter({ onSearch, onStatus, status, sort, onSort }: Props) {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const t = setTimeout(() => onSearch(query), 300);
    return () => clearTimeout(t);
  }, [query, onSearch]);

  return (
    <div className="flex gap-2">
      <input
        type="text"
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Search title or SKU..."
        className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
      />
      <select
        value={status}
        onChange={e => onStatus(e.target.value as ItemStatus | 'all')}
        className="bg-gray-800 border border-gray-600 rounded-lg px-2 py-2 text-sm focus:outline-none focus:border-blue-400 text-white"
      >
        {STATUS_OPTIONS.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <select
        value={sort}
        onChange={e => onSort(e.target.value)}
        className="bg-gray-800 border border-gray-600 rounded-lg px-2 py-2 text-sm focus:outline-none focus:border-blue-400 text-white"
      >
        {SORT_OPTIONS.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}
