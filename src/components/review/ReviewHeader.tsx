'use client';
import Link from 'next/link';

interface Props {
  batchName: string;
  batchId: string;
  reviewed: number;
  total: number;
  view: 'card' | 'table';
  onViewChange: (v: 'card' | 'table') => void;
}

export default function ReviewHeader({ batchName, batchId, reviewed, total, view, onViewChange }: Props) {
  const pct = total > 0 ? Math.round((reviewed / total) * 100) : 0;

  return (
    <div className="sticky top-0 z-10 bg-gray-900 border-b border-gray-700 px-4 py-3">
      <div className="max-w-4xl mx-auto">
        {/* One row on a phone: back, name, view toggle, export. The toggle drops
            its text labels below sm: so the batch name keeps its width. */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <Link href="/" className="text-gray-400 hover:text-white text-sm flex-shrink-0 min-h-11 inline-flex items-center pr-1">← Back</Link>
            <h1 className="font-semibold text-sm truncate">{batchName}</h1>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            <Link
              href={`/export/${batchId}`}
              className="px-3 min-h-11 inline-flex items-center bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors"
            >
              Export
            </Link>
            <button
              onClick={() => onViewChange('table')}
              aria-label="Table view"
              aria-pressed={view === 'table'}
              className={`min-h-11 min-w-11 px-2 sm:px-3 inline-flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                view === 'table' ? 'bg-blue-600 text-white' : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              ☰<span className="hidden sm:inline">&nbsp;Table</span>
            </button>
            <button
              onClick={() => onViewChange('card')}
              aria-label="Card view"
              aria-pressed={view === 'card'}
              className={`min-h-11 min-w-11 px-2 sm:px-3 inline-flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                view === 'card' ? 'bg-blue-600 text-white' : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              ⊞<span className="hidden sm:inline">&nbsp;Cards</span>
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-sm text-gray-400 whitespace-nowrap flex-shrink-0">
            {reviewed} / {total} reviewed
          </span>
        </div>
      </div>
    </div>
  );
}
