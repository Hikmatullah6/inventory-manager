'use client';
import { useEffect, useState } from 'react';
import { ItemStatus } from '@/lib/types';
import { FILTER_ORDER, STATUS_LABEL } from '@/lib/item-status';
import type { StatusCounts } from '@/lib/item-counts';

const STATUS_OPTIONS: { value: ItemStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  ...FILTER_ORDER.filter((v): v is ItemStatus => v !== 'all').map(v => ({
    value: v,
    label: STATUS_LABEL[v],
  })),
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
  /** Server-side totals behind each filter, for the mobile chips. */
  counts: StatusCounts;
}

export default function SearchFilter({ onSearch, onStatus, status, sort, onSort, counts }: Props) {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const t = setTimeout(() => onSearch(query), 300);
    return () => clearTimeout(t);
  }, [query, onSearch]);

  const sortSelect = (className: string) => (
    <select
      value={sort}
      onChange={e => onSort(e.target.value)}
      aria-label="Sort"
      className={className}
    >
      {SORT_OPTIONS.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );

  return (
    <>
      {/* ── Desktop / tablet: unchanged ──────────────────────────────────── */}
      <div className="hidden sm:flex flex-wrap gap-2">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search title or SKU..."
          className="w-full sm:w-auto sm:flex-1 min-h-11 bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-base focus:outline-none focus:border-blue-400"
        />
        <select
          value={status}
          onChange={e => onStatus(e.target.value as ItemStatus | 'all')}
          aria-label="Status"
          className="flex-1 sm:flex-none min-w-0 min-h-11 bg-gray-800 border border-gray-600 rounded-lg px-2 py-2 text-base focus:outline-none focus:border-blue-400 text-white"
        >
          {STATUS_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        {sortSelect('flex-1 sm:flex-none min-w-0 min-h-11 bg-gray-800 border border-gray-600 rounded-lg px-2 py-2 text-base focus:outline-none focus:border-blue-400 text-white')}
      </div>

      {/* ── Phone: the status dropdown becomes chips ─────────────────────── */}
      <div className="sm:hidden flex flex-col gap-[10px]">
        <div className="flex gap-2">
          <div className="relative flex items-center flex-1 min-w-0">
            <span className="absolute left-[14px] text-gray-500 text-base pointer-events-none">⌕</span>
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search title or SKU..."
              className="w-full h-12 bg-gray-800 border border-gray-600 rounded-[10px] pl-[38px] pr-[14px]
                text-base text-white focus:outline-none focus:border-blue-400"
            />
          </div>
          {sortSelect('flex-none h-12 max-w-[42%] bg-gray-800 border border-gray-600 rounded-[10px] px-2 text-base text-white focus:outline-none focus:border-blue-400')}
        </div>

        {/* Bled to the screen edges so the row reads as scrollable. */}
        <div className="no-scrollbar flex gap-2 overflow-x-auto -mx-4 px-4 py-[2px]">
          {STATUS_OPTIONS.map(option => {
            const isSelected = option.value === status;
            const count = option.value === 'all' ? counts.all : counts[option.value];
            return (
              <button
                key={option.value}
                onClick={() => onStatus(option.value)}
                aria-pressed={isSelected}
                className={`flex-none h-10 px-[14px] rounded-full text-sm font-medium whitespace-nowrap
                  border transition-colors ${
                    isSelected
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'bg-gray-800 border-gray-600 text-gray-200 hover:bg-gray-700'
                  }`}
              >
                {option.label} · {count}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
