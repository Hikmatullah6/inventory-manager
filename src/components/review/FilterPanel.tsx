'use client';
import { useCallback, useEffect, useState } from 'react';
import type { FilterCounts } from '@/lib/filter-counts';
import {
  countSelectedFacets, EMPTY_FACET_SELECTION, FACET_FIELDS,
  type FacetField, type FacetSelection,
} from '@/lib/item-query';
import { useFiltersOpen } from '@/hooks/useFiltersOpen';
import FilterDropdown, { useOutsideClose } from './FilterDropdown';
import DateFilter, { monthLabel } from './DateFilter';

/**
 * The filter section under the search bar: one dropdown per column.
 *
 * Both presentations are always mounted and chosen by CSS (`sm:hidden` /
 * `hidden sm:block`), never a JS breakpoint check — the review screen is
 * server-rendered and a breakpoint read during the first render mismatches on
 * hydration.
 *
 * - **`sm:` and up** — a row of dropdown buttons with floating popovers.
 * - **Below `sm:`** — a collapsible panel. Open it and the five columns are
 *   full-width rows that expand in place; a floating popover inside the phone's
 *   scrolling column gets clipped. The open flag is sticky, so it stays open
 *   while you work through a customer's request.
 *
 * Only one dropdown is open at a time, which also keeps the 714-option tag list
 * from being in the DOM alongside the others.
 */

const LABELS: Record<FacetField, string> = {
  category: 'Category',
  subcategory: 'Subcategory',
  tags: 'Tags',
  season: 'Season',
};

type OpenKey = FacetField | 'dates' | null;

interface Props {
  counts: FilterCounts;
  selection: FacetSelection;
  onChange: (next: FacetSelection) => void;
}

export default function FilterPanel({ counts, selection, onChange }: Props) {
  const [open, setOpen] = useState<OpenKey>(null);
  const [panelOpen, setPanelOpen] = useFiltersOpen();

  const close = useCallback(() => setOpen(null), []);
  const popoverRef = useOutsideClose(open !== null, close);

  useEffect(() => {
    if (open === null) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(null);
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  const active = countSelectedFacets(selection);

  function toggle(field: keyof FacetSelection, value: string) {
    const current = selection[field];
    onChange({
      ...selection,
      [field]: current.includes(value) ? current.filter(v => v !== value) : [...current, value],
    });
  }

  function clearField(field: keyof FacetSelection) {
    onChange({ ...selection, [field]: [] });
  }

  /** Unticking a month drops the days that belonged to it. */
  function toggleMonth(month: string) {
    const picked = selection.months.includes(month);
    onChange({
      ...selection,
      months: picked ? selection.months.filter(m => m !== month) : [...selection.months, month],
      dates: picked
        ? selection.dates.filter(d => !d.startsWith(`${month}-`))
        : selection.dates,
    });
  }

  /** Ticking a day implies its month, so the day actually narrows something. */
  function toggleDate(date: string) {
    const month = date.slice(0, 7);
    const picked = selection.dates.includes(date);
    onChange({
      ...selection,
      dates: picked ? selection.dates.filter(d => d !== date) : [...selection.dates, date],
      months: picked || selection.months.includes(month)
        ? selection.months
        : [...selection.months, month],
    });
  }

  const dateLabel = (() => {
    const { months, dates } = selection;
    if (dates.length === 1) return dates[0];
    if (dates.length > 1) return `${dates.length} days`;
    if (months.length === 1) return monthLabel(months[0]);
    if (months.length > 1) return `${months.length} months`;
    return 'Date bought';
  })();

  function buttonClass(count: number) {
    return `min-h-11 px-3 rounded-lg border text-base inline-flex items-center gap-1.5 ${
      count > 0
        ? 'bg-blue-950 border-blue-600 text-blue-200'
        : 'bg-gray-800 border-gray-600 hover:bg-gray-700'
    }`;
  }

  /** The dropdown bodies, shared by both layouts. */
  function dropdown(field: FacetField, variant: 'panel' | 'inline') {
    return (
      <FilterDropdown
        variant={variant}
        label={LABELS[field]}
        options={counts[field]}
        selected={selection[field]}
        onToggle={value => toggle(field, value)}
        onClear={() => clearField(field)}
      />
    );
  }

  function dateDropdown(variant: 'panel' | 'inline') {
    return (
      <DateFilter
        variant={variant}
        months={counts.months}
        dates={counts.dates}
        selectedMonths={selection.months}
        selectedDates={selection.dates}
        onToggleMonth={toggleMonth}
        onToggleDate={toggleDate}
        onClear={() => onChange({ ...selection, months: [], dates: [] })}
      />
    );
  }

  return (
    <>
      {/* ── Desktop / tablet: a row of dropdowns ─────────────────────────── */}
      <div ref={popoverRef} className="hidden sm:flex flex-wrap items-start gap-2">
        {FACET_FIELDS.map(field => (
          <div key={field} className="relative">
            <button
              type="button"
              onClick={() => setOpen(o => (o === field ? null : field))}
              aria-expanded={open === field}
              className={buttonClass(selection[field].length)}
            >
              {LABELS[field]}
              {selection[field].length > 0 && ` · ${selection[field].length}`}
              <span aria-hidden className="text-sm text-gray-400">▾</span>
            </button>
            {open === field && dropdown(field, 'panel')}
          </div>
        ))}

        <div className="relative">
          <button
            type="button"
            onClick={() => setOpen(o => (o === 'dates' ? null : 'dates'))}
            aria-expanded={open === 'dates'}
            className={buttonClass(selection.months.length + selection.dates.length)}
          >
            {dateLabel}
            <span aria-hidden className="text-sm text-gray-400">▾</span>
          </button>
          {open === 'dates' && dateDropdown('panel')}
        </div>

        {active > 0 && (
          <button
            type="button"
            onClick={() => onChange(EMPTY_FACET_SELECTION)}
            className="min-h-11 px-3 rounded-lg text-base text-blue-300 hover:text-blue-200"
          >
            Clear all
          </button>
        )}
      </div>

      {/* ── Phone: a collapsible panel of in-place dropdowns ─────────────── */}
      <div className="sm:hidden">
        <button
          type="button"
          onClick={() => setPanelOpen(!panelOpen)}
          aria-expanded={panelOpen}
          className={`w-full min-h-11 px-3 rounded-[10px] border text-base flex items-center gap-2 ${
            active > 0
              ? 'bg-blue-950 border-blue-600 text-blue-200'
              : 'bg-gray-800 border-gray-600'
          }`}
        >
          <span className="flex-1 text-left">
            Filters{active > 0 ? ` · ${active}` : ''}
          </span>
          <span aria-hidden className={`transition-transform ${panelOpen ? 'rotate-90' : ''}`}>▸</span>
        </button>

        {panelOpen && (
          <div className="mt-2 bg-gray-800 border border-gray-700 rounded-[10px] divide-y divide-gray-700">
            {FACET_FIELDS.map(field => (
              <div key={field}>
                <button
                  type="button"
                  onClick={() => setOpen(o => (o === field ? null : field))}
                  aria-expanded={open === field}
                  className="w-full min-h-11 px-3 flex items-center gap-2 text-base text-left"
                >
                  <span className="flex-1 min-w-0 truncate">{LABELS[field]}</span>
                  {selection[field].length > 0 && (
                    <span className="flex-none text-sm text-blue-300">{selection[field].length}</span>
                  )}
                  <span aria-hidden className={`flex-none text-gray-500 transition-transform ${open === field ? 'rotate-90' : ''}`}>▸</span>
                </button>
                {open === field && (
                  <div className="px-2 max-h-[45dvh] overflow-y-auto">{dropdown(field, 'inline')}</div>
                )}
              </div>
            ))}

            <div>
              <button
                type="button"
                onClick={() => setOpen(o => (o === 'dates' ? null : 'dates'))}
                aria-expanded={open === 'dates'}
                className="w-full min-h-11 px-3 flex items-center gap-2 text-base text-left"
              >
                <span className="flex-1 min-w-0 truncate">{dateLabel}</span>
                <span aria-hidden className={`flex-none text-gray-500 transition-transform ${open === 'dates' ? 'rotate-90' : ''}`}>▸</span>
              </button>
              {open === 'dates' && (
                <div className="px-2 max-h-[45dvh] overflow-y-auto">{dateDropdown('inline')}</div>
              )}
            </div>

            {active > 0 && (
              <button
                type="button"
                onClick={() => onChange(EMPTY_FACET_SELECTION)}
                className="w-full min-h-11 px-3 text-base text-left text-blue-300"
              >
                Clear all filters
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
}
