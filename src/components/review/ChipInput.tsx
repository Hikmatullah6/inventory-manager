'use client';
import { useState } from 'react';

/**
 * The editor for a multi-value field (subcategory, tags).
 *
 * Both are one comma-separated cell in the import sheet and a text[] column, so
 * the whole array is committed at once rather than per chip. Typing a comma
 * commits too, because that is how these get pasted in from the sheet.
 */
export default function ChipInput({ label, values, placeholder, suggestions = [], onChange }: {
  label: string;
  values: string[];
  placeholder?: string;
  /** Existing values in this batch, offered as a datalist. */
  suggestions?: string[];
  onChange: (next: string[]) => void;
}) {
  const [draft, setDraft] = useState('');
  const listId = `${label.toLowerCase().replace(/\s+/g, '-')}-options`;

  function add(raw: string) {
    const parts = raw.split(',').map(s => s.trim()).filter(Boolean);
    if (parts.length === 0) return;
    const next = [...values];
    for (const p of parts) if (!next.includes(p)) next.push(p);
    setDraft('');
    if (next.length !== values.length) onChange(next);
  }

  function remove(value: string) {
    onChange(values.filter(v => v !== value));
  }

  return (
    <div>
      <label className="block text-sm text-gray-400 mb-1">{label}</label>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {values.map(value => (
            <span
              key={value}
              className="inline-flex items-center gap-1 bg-gray-700 border border-gray-600
                rounded-full pl-3 pr-1 py-0.5 text-sm max-w-full"
            >
              <span className="truncate">{value}</span>
              <button
                type="button"
                onClick={() => remove(value)}
                aria-label={`Remove ${value}`}
                className="min-h-11 min-w-11 -my-2 flex items-center justify-center
                  text-gray-400 hover:text-white"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      <input
        type="text"
        value={draft}
        list={suggestions.length > 0 ? listId : undefined}
        onChange={e => {
          // A comma means the value is finished — this is how a cell pasted
          // straight out of the sheet turns into chips.
          if (e.target.value.includes(',')) add(e.target.value);
          else setDraft(e.target.value);
        }}
        onKeyDown={e => {
          if (e.key === 'Enter') { e.preventDefault(); add(draft); }
          else if (e.key === 'Backspace' && !draft && values.length > 0) remove(values[values.length - 1]);
        }}
        onBlur={() => add(draft)}
        placeholder={placeholder ?? 'Type and press Enter'}
        className="w-full min-h-11 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-base
          focus:outline-none focus:border-blue-400"
      />
      {suggestions.length > 0 && (
        <datalist id={listId}>
          {suggestions.map(s => <option key={s} value={s} />)}
        </datalist>
      )}
    </div>
  );
}
