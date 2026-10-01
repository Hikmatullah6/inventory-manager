'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { FacetCount } from '@/lib/filter-counts';

/**
 * One filter column's options: checkboxes with match counts.
 *
 * Rendered two ways by the same component, because the phone and the desktop
 * need genuinely different containers and a JS breakpoint check would mismatch on
 * hydration:
 *
 * - `panel` — a floating popover. Fine at `sm:` and up, where there is room
 *   beside the list.
 * - `inline` — expands in place, pushing the rows below it down. A floating
 *   popover inside the phone's scrolling detail column gets clipped by its
 *   ancestors or ends up positioned off-screen.
 *
 * Options arrive sorted by count descending, so what is actually in the batch is
 * at the top and the unavailable (count 0, greyed) values sink to the bottom
 * instead of filling the list. A real batch has 714 tags, so beyond SEARCH_AFTER
 * values the list gets a type-to-narrow box and renders at most MAX_ROWS.
 */

const SEARCH_AFTER = 12;
const MAX_ROWS = 100;

export default function FilterDropdown({ variant, label, options, selected, onToggle, onClear }: {
  variant: 'panel' | 'inline';
  label: string;
  options: FacetCount[];
  selected: string[];
  onToggle: (value: string) => void;
  onClear: () => void;
}) {
  const [query, setQuery] = useState('');

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matching = q
      ? options.filter(o => o.value.toLowerCase().includes(q))
      : options;
    // Selected values stay visible even when filtered out or unavailable, so a
    // filter can always be unticked from where it was ticked.
    const chosen = options.filter(o => selected.includes(o.value) && !matching.includes(o));
    return [...chosen, ...matching];
  }, [options, query, selected]);

  const shown = visible.slice(0, MAX_ROWS);
  const hidden = visible.length - shown.length;

  const rows = (
    <>
      {options.length > SEARCH_AFTER && (
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={`Search ${label.toLowerCase()}...`}
          aria-label={`Search ${label}`}
          className="w-full min-h-11 bg-gray-900 border border-gray-600 rounded-lg px-3 py-2
            text-base text-white placeholder-gray-500 focus:outline-none focus:border-blue-400 mb-1"
        />
      )}

      {shown.length === 0 ? (
        <p className="text-sm text-gray-500 py-2 px-1">
          {options.length === 0 ? 'Nothing to filter by yet.' : 'No match.'}
        </p>
      ) : (
        shown.map(option => {
          const checked = selected.includes(option.value);
          // Unavailable, but never disable something already ticked — that would
          // trap the filter on.
          const dead = option.count === 0 && !checked;
          return (
            <button
              key={option.value}
              type="button"
              role="checkbox"
              aria-checked={checked}
              disabled={dead}
              onClick={() => onToggle(option.value)}
              className={`w-full min-h-11 flex items-center gap-2.5 text-left px-1 rounded
                ${dead ? 'opacity-40 cursor-not-allowed' : 'hover:bg-gray-700/50'}`}
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
              <span className="flex-1 min-w-0 truncate text-base">{option.value}</span>
              <span className="flex-none text-sm text-gray-400 tabular-nums">{option.count}</span>
            </button>
          );
        })
      )}

      {hidden > 0 && (
        <p className="text-sm text-gray-500 py-1 px-1">
          {hidden} more — keep typing to narrow.
        </p>
      )}

      {selected.length > 0 && (
        <button
          type="button"
          onClick={onClear}
          className="w-full min-h-11 mt-1 pt-2 border-t border-gray-700 text-sm text-blue-300
            hover:text-blue-200 text-left px-1"
        >
          Clear {label.toLowerCase()}
        </button>
      )}
    </>
  );

  if (variant === 'inline') {
    return <div className="pl-1 pr-1 pb-2 flex flex-col">{rows}</div>;
  }

  return (
    <div
      role="group"
      aria-label={label}
      className="absolute left-0 top-full z-30 mt-1 w-72 max-h-80 overflow-y-auto
        bg-gray-800 border border-gray-600 rounded-lg shadow-xl p-2 flex flex-col"
    >
      {rows}
    </div>
  );
}

/** Closes a popover on an outside click. Escape is handled by the panel. */
export function useOutsideClose(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open, onClose]);
  return ref;
}
