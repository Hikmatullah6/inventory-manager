'use client';
import { Item, ItemUpdate } from '@/lib/types';
import { STATUS_BADGE, STATUS_LABEL } from '@/lib/item-status';
import ItemDetail from './ItemDetail';
import MobileItemList from './MobileItemList';
import MobileDetailPane from './MobileDetailPane';

interface Props {
  items: Item[];
  onUpdate: (id: string, update: ItemUpdate) => void;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

/**
 * The item list.
 *
 * Two layouts, chosen by CSS rather than JS so there is no hydration mismatch:
 *
 * - `sm:` and up — the table with a 320px detail panel beside it, unchanged.
 * - below `sm:` — full-width rows, and a rail + detail pane once an item is
 *   selected. A five-column table in a 375px viewport meant the Status column,
 *   the reason he opens the screen, was off the right edge.
 */
export default function TableView({ items, onUpdate, selectedId, onSelect }: Props) {
  // Derived, not stored: if a filter or search change drops the selected item
  // from the page, that falls back to the list on its own.
  const selected = items.find(i => i.id === selectedId) ?? null;

  if (!items.length) return (
    <div className="flex items-center justify-center h-64 text-gray-500">
      <p>No items to display</p>
    </div>
  );

  return (
    <>
      {/* ── Desktop / tablet ─────────────────────────────────────────────── */}
      <div className="hidden sm:flex gap-4" style={{ minHeight: '60vh' }}>
        <div className="flex-1 min-w-0 overflow-auto rounded-lg border border-gray-700">
          <table className="w-full min-w-[520px] text-sm">
            <thead className="sticky top-0 bg-gray-800 text-gray-400 text-sm uppercase">
              <tr>
                <th className="text-left px-3 py-2">SKU</th>
                <th className="text-left px-3 py-2">Title</th>
                <th className="text-left px-3 py-2">Status</th>
                <th className="text-right px-3 py-2">Good</th>
                <th className="text-right px-3 py-2">Sold</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr
                  key={item.id}
                  onClick={() => onSelect(item.id === selectedId ? null : item.id)}
                  className={`border-t border-gray-700 cursor-pointer transition-colors ${
                    item.id === selectedId ? 'bg-blue-950' : 'hover:bg-gray-800'
                  }`}
                >
                  <td className="px-3 py-2.5 text-green-400 font-mono text-sm">{item.sku}</td>
                  <td className="px-3 py-2.5 max-w-[200px]">
                    <span className="block truncate">{item.title}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`text-sm px-2 py-0.5 rounded-full whitespace-nowrap ${STATUS_BADGE[item.status]}`}>
                      {STATUS_LABEL[item.status]}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right text-gray-400 text-sm">
                    {item.qty_good ?? '—'}
                  </td>
                  <td className="px-3 py-2.5 text-right text-gray-400 text-sm">
                    {item.qty_sold}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {selected && (
          <div className="w-80 flex-shrink-0 overflow-y-auto bg-gray-800 rounded-lg border border-gray-700 p-4 sticky top-4 self-start max-h-[calc(100vh-2rem)]">
            <button
              onClick={() => onSelect(null)}
              className="text-gray-400 hover:text-white text-sm mb-3 min-h-11 inline-flex items-center"
            >
              ✕ Close
            </button>
            <ItemDetail key={selected.id} item={selected} onUpdate={onUpdate} />
          </div>
        )}
      </div>

      {/* ── Phone ────────────────────────────────────────────────────────── */}
      <div className="sm:hidden flex-1 min-h-0 flex flex-col">
        {selected ? (
          <MobileDetailPane
            key={selected.id}
            items={items}
            item={selected}
            onSelect={onSelect}
            onClose={() => onSelect(null)}
            onUpdate={onUpdate}
          />
        ) : (
          <MobileItemList items={items} onSelect={onSelect} />
        )}
      </div>
    </>
  );
}
