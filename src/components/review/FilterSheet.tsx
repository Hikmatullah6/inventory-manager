'use client';
import { useEffect, useState } from 'react';
import type { ItemFacets } from '@/lib/types';
import type { FacetSelection } from '@/lib/item-query';
import { countSelectedFacets, EMPTY_FACET_SELECTION } from '@/lib/item-query';

/**
 * The five facet filters — date bought, category, subcategory, tags, season.
 *
 * One component for both layouts: a bottom sheet below `sm:`, where five pickers
 * will not fit in the chip rail and a second horizontal scroller would fight the
 * status rail for the same gesture; a dropdown panel at `sm:` and up.
 *
 * Selections are held locally and committed once on Show items, so filtering is
 * one refetch per session with the sheet rather than one per tap.
 */

interface Group {
  key: keyof FacetSelection;
  label: string;
  values: string[];
}

function groupsFor(facets: ItemFacets): Group[] {
  return [
    { key: 'dateBought', label: 'Date bought', values: facets.dateBought },
    { key: 'category', label: 'Category', values: facets.categories },
    { key: 'subcategory', label: 'Subcategory', values: facets.subcategories },
    { key: 'tags', label: 'Tags', values: facets.tags },
    { key: 'season', label: 'Season', values: facets.seasons },
  ];
}

function FilterBody({ draft, groups, onToggleValue }: {
  draft: FacetSelection;
  groups: Group[];
  onToggleValue: (key: keyof FacetSelection, value: string) => void;
}) {
  const anyValues = groups.some(g => g.values.length > 0);

  if (!anyValues) {
    return (
      <p className="text-sm text-gray-400 py-2">
        This batch has no categories, tags or seasons to filter by yet.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {groups.filter(g => g.values.length > 0).map(group => (
        <div key={group.key}>
          <h3 className="text-sm text-gray-400 mb-1">{group.label}</h3>
          <div className="flex flex-col">
            {group.values.map(value => {
              const checked = draft[group.key].includes(value);
              return (
                <button
                  key={value}
                  type="button"
                  role="checkbox"
                  aria-checked={checked}
                  onClick={() => onToggleValue(group.key, value)}
                  className="w-full min-h-11 flex items-center gap-3 text-left text-base
                    px-1 rounded hover:bg-gray-700/50"
                >
                  <span
                    aria-hidden
                    className={`flex-none w-5 h-5 rounded border flex items-center justify-center text-xs
                      ${checked
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'border-gray-600 text-transparent'}`}
                  >
                    ✓
                  </span>
                  <span className="flex-1 min-w-0 truncate">{value}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function FilterSheet({ variant, facets, selection, onApply, onClose }: {
  /** Which presentation to render. The caller picks per layout, so only one
   *  dialog is ever in the tree for a given breakpoint. */
  variant: 'sheet' | 'panel';
  facets: ItemFacets;
  selection: FacetSelection;
  onApply: (next: FacetSelection) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<FacetSelection>(selection);
  const groups = groupsFor(facets);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  function toggleValue(key: keyof FacetSelection, value: string) {
    setDraft(d => ({
      ...d,
      [key]: d[key].includes(value) ? d[key].filter(v => v !== value) : [...d[key], value],
    }));
  }

  function apply(next: FacetSelection) {
    onApply(next);
    onClose();
  }

  const count = countSelectedFacets(draft);

  if (variant === 'panel') {
    return (
      <div
        role="dialog"
        aria-label="Filters"
        className="absolute z-20 mt-1 w-full max-w-md max-h-80 overflow-y-auto
          bg-gray-800 border border-gray-600 rounded-lg shadow-xl p-3"
      >
        <FilterBody draft={draft} groups={groups} onToggleValue={toggleValue} />
        <div className="flex gap-2 pt-3 mt-3 border-t border-gray-700">
          <button
            type="button"
            onClick={() => apply(EMPTY_FACET_SELECTION)}
            className="flex-none min-h-11 px-3 rounded-lg bg-gray-700 hover:bg-gray-600 text-sm"
          >
            Clear all
          </button>
          <button
            type="button"
            onClick={() => apply(draft)}
            className="flex-1 min-h-11 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-sm font-medium"
          >
            Apply{count > 0 ? ` · ${count}` : ''}
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* A bottom sheet: the phone presentation. */}
      <div className="fixed inset-0 z-40 bg-black/70" onClick={onClose}>
        <div
          role="dialog"
          aria-label="Filters"
          onClick={e => e.stopPropagation()}
          className="absolute inset-x-0 bottom-0 max-h-[85dvh] flex flex-col
            bg-gray-900 border-t border-gray-700 rounded-t-2xl"
        >
          <div className="flex-none flex items-center justify-between px-4 min-h-14 border-b border-gray-700">
            <h2 className="text-base font-semibold">Filters</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close filters"
              className="min-h-11 min-w-11 flex items-center justify-center text-gray-400 hover:text-white"
            >
              ✕
            </button>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3">
            <FilterBody draft={draft} groups={groups} onToggleValue={toggleValue} />
          </div>

          <div className="flex-none flex gap-2 px-4 pt-3 border-t border-gray-700
            pb-[max(12px,env(safe-area-inset-bottom))]">
            <button
              type="button"
              onClick={() => setDraft(EMPTY_FACET_SELECTION)}
              className="flex-none min-h-11 px-4 rounded-lg bg-gray-700 hover:bg-gray-600 text-base"
            >
              Clear all
            </button>
            <button
              type="button"
              onClick={() => apply(draft)}
              className="flex-1 min-h-11 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 text-base font-medium"
            >
              Show items{count > 0 ? ` · ${count}` : ''}
            </button>
          </div>
        </div>
      </div>

    </>
  );
}
