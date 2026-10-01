'use client';
import { useEffect, useState } from 'react';
import { ItemStatus } from '@/lib/types';
import { FILTER_ORDER, STATUS_LABEL } from '@/lib/item-status';
import type { FilterCounts } from '@/lib/filter-counts';
import { SORT_KEYS, SORT_MAP, type FacetSelection, type SortKey } from '@/lib/item-query';
import FilterPanel from './FilterPanel';

const STATUS_OPTIONS: { value: ItemStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  ...FILTER_ORDER.filter((v): v is ItemStatus => v !== 'all').map(v => ({
    value: v,
    label: STATUS_LABEL[v],
  })),
];

/** Derived from SORT_MAP, so the dropdown cannot offer a sort the server lacks. */
const SORT_OPTIONS = SORT_KEYS.map(value => ({ value, label: SORT_MAP[value].label }));

interface Props {
  onSearch: (q: string) => void;
  onStatus: (s: ItemStatus | 'all') => void;
  status: ItemStatus | 'all';
  sort: SortKey;
  onSort: (s: SortKey) => void;
  /** Status chip totals and every dropdown option's count, from one query. */
  counts: FilterCounts;
  facetSelection: FacetSelection;
  onFacetSelection: (next: FacetSelection) => void;
}

export default function SearchFilter({
  onSearch, onStatus, status, sort, onSort, counts,
  facetSelection, onFacetSelection,
}: Props) {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const t = setTimeout(() => onSearch(query), 300);
    return () => clearTimeout(t);
  }, [query, onSearch]);

  const sortSelect = (className: string) => (
    <select
      value={sort}
      onChange={e => onSort(e.target.value as SortKey)}
      aria-label="Sort"
      className={className}
    >
      {SORT_OPTIONS.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );

  return (
    <div className="flex flex-col gap-[10px]">
      {/* ── Search + status + sort ───────────────────────────────────────── */}
      <div className="hidden sm:flex flex-wrap gap-2">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search title or SKU..."
          className="sm:flex-1 min-w-[12rem] min-h-11 bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-base text-white placeholder-gray-500 focus:outline-none focus:border-blue-400"
        />
        <select
          value={status}
          onChange={e => onStatus(e.target.value as ItemStatus | 'all')}
          aria-label="Status"
          className="min-h-11 bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-base text-white focus:outline-none focus:border-blue-400"
        >
          {STATUS_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        {sortSelect('min-h-11 bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-base text-white focus:outline-none focus:border-blue-400')}
      </div>

      <div className="sm:hidden flex gap-2">
        <div className="relative flex-1 min-w-0">
          <span className="absolute left-[14px] top-1/2 -translate-y-1/2 text-gray-500 text-base pointer-events-none">
            ⌕
          </span>
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search title or SKU..."
            className="w-full h-12 bg-gray-800 border border-gray-600 rounded-[10px] pl-[38px] pr-3 text-base text-white placeholder-gray-500 focus:outline-none focus:border-blue-400"
          />
        </div>
        {sortSelect('max-w-[42%] h-12 bg-gray-800 border border-gray-600 rounded-[10px] px-2 text-base text-white focus:outline-none focus:border-blue-400')}
      </div>

      {/* ── The filter section: one dropdown per column ──────────────────── */}
      <FilterPanel
        counts={counts}
        selection={facetSelection}
        onChange={onFacetSelection}
      />

      {/* ── Status stays chips below sm: — the primary axis, with live counts ── */}
      <div className="sm:hidden no-scrollbar flex gap-2 overflow-x-auto -mx-4 px-4 py-[2px]">
        {STATUS_OPTIONS.map(option => {
          const count = option.value === 'all'
            ? counts.statuses.all
            : counts.statuses[option.value];
          const isSelected = option.value === status;
          return (
            <button
              key={option.value}
              onClick={() => onStatus(option.value)}
              aria-pressed={isSelected}
              className={`flex-none h-10 px-[14px] rounded-full border text-sm whitespace-nowrap
                transition-colors ${
                  isSelected
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'bg-gray-800 border-gray-600 hover:bg-gray-700'
                }`}
            >
              {option.label} · {count}
            </button>
          );
        })}
      </div>
    </div>
  );
}
