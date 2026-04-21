'use client';
import { useState, useEffect } from 'react';
import { Item, ItemStatus, ItemUpdate } from '@/lib/types';

const STATUS_OPTIONS: { value: ItemStatus; label: string; color: string }[] = [
  { value: 'have_it',      label: '✓ Have It',        color: 'bg-green-700 hover:bg-green-600'   },
  { value: 'dont_have',    label: "✗ Don't Have",     color: 'bg-gray-600 hover:bg-gray-500'     },
  { value: 'broken',       label: '⚠ Broken',          color: 'bg-red-700 hover:bg-red-600'       },
  { value: 'partial',      label: '⅟ Partial',         color: 'bg-orange-700 hover:bg-orange-600' },
  { value: 'sold',         label: '$ Sold',            color: 'bg-blue-700 hover:bg-blue-600'     },
  { value: 'personal_use', label: '♥ Personal Use',   color: 'bg-purple-700 hover:bg-purple-600' },
];

interface Props {
  item: Item;
  onUpdate: (id: string, update: ItemUpdate) => void;
}

export default function ItemDetail({ item, onUpdate }: Props) {
  const [status, setStatus] = useState<ItemStatus>(item.status);
  const [qtyGood, setQtyGood] = useState(item.qty_good != null ? String(item.qty_good) : '');
  const [qtyBroken, setQtyBroken] = useState(item.qty_broken != null ? String(item.qty_broken) : '');
  const [qtySold, setQtySold] = useState(String(item.qty_sold));
  const [location, setLocation] = useState(item.shelf_location ?? '');
  const [notes, setNotes] = useState(item.notes ?? '');
  const [salePrice, setSalePrice] = useState(item.sale_price != null ? String(item.sale_price) : '');
  const [imgError, setImgError] = useState(false);

  // Sync state when item changes (e.g. card view navigates to next item)
  useEffect(() => {
    setStatus(item.status);
    setQtyGood(item.qty_good != null ? String(item.qty_good) : '');
    setQtyBroken(item.qty_broken != null ? String(item.qty_broken) : '');
    setQtySold(String(item.qty_sold));
    setLocation(item.shelf_location ?? '');
    setNotes(item.notes ?? '');
    setSalePrice(item.sale_price != null ? String(item.sale_price) : '');
    setImgError(false);
  }, [item.id]);

  function handleStatusClick(s: ItemStatus) {
    setStatus(s);
    onUpdate(item.id, { status: s });
  }

  function handleBlur(field: keyof ItemUpdate, value: string | number | null) {
    onUpdate(item.id, { [field]: value });
  }

  return (
    <div className="space-y-4">
      {/* Thumbnail */}
      <div className="w-full aspect-video bg-gray-800 rounded-lg overflow-hidden flex items-center justify-center">
        {item.thumbnail_url && !imgError ? (
          <img
            src={item.thumbnail_url}
            alt={item.title}
            className="w-full h-full object-contain"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="text-center text-gray-500">
            <div className="text-3xl mb-1">🖼</div>
            <p className="text-xs">{item.sku}</p>
          </div>
        )}
      </div>

      {/* Item info */}
      <div>
        <h2 className="font-semibold text-base leading-snug">{item.title}</h2>
        <div className="text-xs text-gray-400 mt-1 flex flex-wrap gap-x-3 gap-y-1">
          <span>SKU: {item.sku}</span>
          {item.cost != null && <span>Cost: ${item.cost}</span>}
          {item.company_name && <span>{item.company_name}</span>}
        </div>
        {item.link && (
          <a
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-400 hover:underline mt-1 block"
          >
            View original listing ↗
          </a>
        )}
        {item.description && (
          <p className="text-xs text-gray-400 mt-2 line-clamp-3">{item.description}</p>
        )}
      </div>

      {/* Status buttons — 2x2 grid, touch-friendly */}
      <div className="grid grid-cols-2 gap-2">
        {STATUS_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => handleStatusClick(opt.value)}
            className={`py-3 rounded-lg text-sm font-medium transition-colors
              ${status === opt.value
                ? opt.color + ' ring-2 ring-white ring-offset-1 ring-offset-gray-900'
                : 'bg-gray-700 hover:bg-gray-600'
              }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {status === 'sold' && (
        <div>
          <label className="text-xs text-gray-400 block mb-1">Sale Price (optional)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={salePrice}
            onChange={e => setSalePrice(e.target.value)}
            onBlur={() => {
              const num = salePrice === '' ? null : parseFloat(salePrice);
              onUpdate(item.id, { sale_price: num });
            }}
            placeholder="0.00"
            className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
          />
        </div>
      )}

      {/* Quantities */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Qty Good',   value: qtyGood,   setter: setQtyGood,   field: 'qty_good' as keyof ItemUpdate },
          { label: 'Qty Broken', value: qtyBroken, setter: setQtyBroken, field: 'qty_broken' as keyof ItemUpdate },
          { label: 'Qty Sold',   value: qtySold,   setter: setQtySold,   field: 'qty_sold' as keyof ItemUpdate },
        ].map(({ label, value, setter, field }) => (
          <div key={field}>
            <label className="text-xs text-gray-400 block mb-1">{label}</label>
            <input
              type="number"
              min="0"
              value={value}
              onChange={e => setter(e.target.value)}
              onBlur={() => {
                const num = value === '' ? null : parseInt(value, 10);
                handleBlur(field, field === 'qty_sold' ? (num ?? 0) : num);
              }}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-2 py-2 text-sm focus:outline-none focus:border-blue-400"
            />
          </div>
        ))}
      </div>

      {/* Location */}
      <div>
        <label className="text-xs text-gray-400 block mb-1">Shelf / Location</label>
        <input
          type="text"
          value={location}
          onChange={e => setLocation(e.target.value)}
          onBlur={() => handleBlur('shelf_location', location || null)}
          placeholder="e.g. Shelf B2, Back Room"
          className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
        />
      </div>

      {/* Notes */}
      <div>
        <label className="text-xs text-gray-400 block mb-1">Notes</label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          onBlur={() => handleBlur('notes', notes || null)}
          rows={2}
          placeholder="Any notes..."
          className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 resize-none"
        />
      </div>
    </div>
  );
}
