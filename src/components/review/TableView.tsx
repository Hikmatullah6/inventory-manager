'use client';
import { useState } from 'react';
import { Item, ItemUpdate } from '@/lib/types';
import ItemDetail from './ItemDetail';

const STATUS_BADGE: Record<string, string> = {
  pending:   'bg-yellow-700 text-yellow-100',
  have_it:   'bg-green-700 text-green-100',
  dont_have: 'bg-gray-600 text-gray-200',
  broken:    'bg-red-700 text-red-100',
  partial:   'bg-orange-700 text-orange-100',
};

const STATUS_LABEL: Record<string, string> = {
  pending:   '⏳ Pending',
  have_it:   '✓ Have It',
  dont_have: "✗ Don't Have",
  broken:    '⚠ Broken',
  partial:   '⅟ Partial',
};

interface Props {
  items: Item[];
  onUpdate: (id: string, update: ItemUpdate) => void;
}

export default function TableView({ items, onUpdate }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = items.find(i => i.id === selectedId) ?? null;

  if (!items.length) return (
    <div className="flex items-center justify-center h-64 text-gray-500">
      <p>No items to display</p>
    </div>
  );

  return (
    <div className="flex gap-4" style={{ minHeight: '60vh' }}>
      {/* Table */}
      <div className="flex-1 overflow-y-auto rounded-lg border border-gray-700">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-gray-800 text-gray-400 text-xs uppercase">
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
                onClick={() => setSelectedId(item.id === selectedId ? null : item.id)}
                className={`border-t border-gray-700 cursor-pointer transition-colors ${
                  item.id === selectedId ? 'bg-blue-950' : 'hover:bg-gray-800'
                }`}
              >
                <td className="px-3 py-2.5 text-green-400 font-mono text-xs">{item.sku}</td>
                <td className="px-3 py-2.5 max-w-[200px]">
                  <span className="block truncate">{item.title}</span>
                </td>
                <td className="px-3 py-2.5">
                  <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${STATUS_BADGE[item.status]}`}>
                    {STATUS_LABEL[item.status]}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-right text-gray-400 text-xs">
                  {item.qty_good ?? '—'}
                </td>
                <td className="px-3 py-2.5 text-right text-gray-400 text-xs">
                  {item.qty_sold}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Slide-out detail panel */}
      {selected && (
        <div className="w-80 flex-shrink-0 overflow-y-auto bg-gray-800 rounded-lg border border-gray-700 p-4">
          <button
            onClick={() => setSelectedId(null)}
            className="text-gray-400 hover:text-white text-xs mb-3 block"
          >
            ✕ Close
          </button>
          <ItemDetail item={selected} onUpdate={onUpdate} />
        </div>
      )}
    </div>
  );
}
