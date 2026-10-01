'use client';
import { useState } from 'react';
import type { DateCount, FacetCount } from '@/lib/filter-counts';

/**
 * Date bought: months, each expanding to its own days.
 *
 * A real batch has ~190 distinct purchase dates. Flat, that is a list nobody
 * scrolls; grouped, it is about eight months — the scale a buying trip is
 * actually remembered at. Picking a month filters to it; ticking days inside a
 * month narrows further within it.
 */

/** '2026-09' -> 'September 2026'. Built from the parts, so no timezone shift. */
export function monthLabel(month: string): string {
  const [y, m] = month.split('-');
  const names = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  return `${names[Number(m) - 1] ?? month} ${y}`;
}

/** '2026-09-27' -> 'Sun 27'. Parsed as UTC so the day never slips backwards. */
function dayLabel(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getUTCDay()];
  return `${weekday} ${d.getUTCDate()}`;
}

export default function DateFilter({ variant, months, dates, selectedMonths, selectedDates, onToggleMonth, onToggleDate, onClear }: {
  variant: 'panel' | 'inline';
  months: FacetCount[];
  dates: DateCount[];
  selectedMonths: string[];
  selectedDates: string[];
  onToggleMonth: (month: string) => void;
  onToggleDate: (date: string) => void;
  onClear: () => void;
}) {
  // Which months are expanded to show their days. A selected month opens by
  // default; this tracks the ones opened by hand on top of that.
  const [expanded, setExpanded] = useState<string[]>([]);

  const rows = (
    <>
      {months.length === 0 ? (
        <p className="text-sm text-gray-500 py-2 px-1">No purchase dates yet.</p>
      ) : (
        months.map(month => {
          const checked = selectedMonths.includes(month.value);
          const dead = month.count === 0 && !checked;
          const open = expanded.includes(month.value) || checked;
          const days = dates.filter(d => d.month === month.value);

          return (
            <div key={month.value}>
              <div className="flex items-center">
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={checked}
                  disabled={dead}
                  onClick={() => onToggleMonth(month.value)}
                  className={`flex-1 min-w-0 min-h-11 flex items-center gap-2.5 text-left px-1 rounded
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
                  <span className="flex-1 min-w-0 truncate text-base">{monthLabel(month.value)}</span>
                  <span className="flex-none text-sm text-gray-400 tabular-nums">{month.count}</span>
                </button>
                {days.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setExpanded(e =>
                      e.includes(month.value) ? e.filter(m => m !== month.value) : [...e, month.value])}
                    aria-expanded={open}
                    aria-label={`${open ? 'Hide' : 'Show'} days in ${monthLabel(month.value)}`}
                    className="flex-none min-h-11 min-w-11 flex items-center justify-center
                      text-gray-500 hover:text-white"
                  >
                    <span className={`inline-block transition-transform ${open ? 'rotate-90' : ''}`}>▸</span>
                  </button>
                )}
              </div>

              {open && days.length > 1 && (
                <div className="ml-4 pl-2 border-l border-gray-700 flex flex-col">
                  {days.map(day => {
                    const dayChecked = selectedDates.includes(day.value);
                    const dayDead = day.count === 0 && !dayChecked;
                    return (
                      <button
                        key={day.value}
                        type="button"
                        role="checkbox"
                        aria-checked={dayChecked}
                        disabled={dayDead}
                        onClick={() => onToggleDate(day.value)}
                        className={`w-full min-h-11 flex items-center gap-2.5 text-left px-1 rounded
                          ${dayDead ? 'opacity-40 cursor-not-allowed' : 'hover:bg-gray-700/50'}`}
                      >
                        <span
                          aria-hidden
                          className={`flex-none w-4 h-4 rounded border flex items-center justify-center text-[10px]
                            ${dayChecked
                              ? 'bg-blue-600 border-blue-600 text-white'
                              : 'border-gray-600 text-transparent'}`}
                        >
                          ✓
                        </span>
                        <span className="flex-1 min-w-0 truncate text-sm">{dayLabel(day.value)}</span>
                        <span className="flex-none text-sm text-gray-400 tabular-nums">{day.count}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })
      )}

      {(selectedMonths.length > 0 || selectedDates.length > 0) && (
        <button
          type="button"
          onClick={onClear}
          className="w-full min-h-11 mt-1 pt-2 border-t border-gray-700 text-sm text-blue-300
            hover:text-blue-200 text-left px-1"
        >
          Clear dates
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
      aria-label="Date bought"
      className="absolute left-0 top-full z-30 mt-1 w-72 max-h-80 overflow-y-auto
        bg-gray-800 border border-gray-600 rounded-lg shadow-xl p-2 flex flex-col"
    >
      {rows}
    </div>
  );
}
