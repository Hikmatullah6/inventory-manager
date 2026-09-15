'use client';
import { Item, ItemUpdate } from '@/lib/types';
import { thumbnailSrc } from '@/lib/thumbnail';
import { STATUS_OPTIONS } from '@/lib/item-status';
import { useItemForm } from '@/hooks/useItemForm';

interface Props {
  item: Item;
  onUpdate: (id: string, update: ItemUpdate) => void;
}

/** Desktop detail panel. Callers key this on item.id. */
export default function ItemDetail({ item, onUpdate }: Props) {
  const {
    status, qtyGood, setQtyGood, qtyBroken, setQtyBroken, qtySold, setQtySold,
    location, setLocation, notes, setNotes, salePrice, setSalePrice,
    imgError, setImgError, handleStatusClick, handleBlur,
  } = useItemForm(item, onUpdate);

  // Served through our own origin: the auction CDN rejects requests that do not
  // look like a browser, which is what a content blocker or a privacy browser
  // on his phone produces. See /api/thumbnail.
  const photoSrc = thumbnailSrc(item.thumbnail_url);

  return (
    <div className="space-y-4">
      {/* Thumbnail */}
      <div className="w-full aspect-video bg-gray-800 rounded-lg overflow-hidden flex items-center justify-center">
        {photoSrc && !imgError ? (
          <img
            src={photoSrc}
            alt={item.title}
            className="w-full h-full object-contain"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="text-center text-gray-500">
            <div className="text-3xl mb-1">🖼</div>
            <p className="text-sm">{item.sku}</p>
          </div>
        )}
      </div>

      {/* Item info */}
      <div>
        <h2 className="font-semibold text-base leading-snug">{item.title}</h2>
        <div className="text-sm text-gray-400 mt-1 flex flex-wrap gap-x-3 gap-y-1">
          <span>SKU: {item.sku}</span>
          {item.cost != null && <span>Cost: ${item.cost}</span>}
          {item.company_name && <span>{item.company_name}</span>}
        </div>
        {item.link && (
          <a
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-400 hover:underline mt-1 min-h-11 inline-flex items-center"
          >
            View original listing ↗
          </a>
        )}
        {item.description && (
          <p className="text-sm text-gray-400 mt-2 line-clamp-3">{item.description}</p>
        )}
      </div>

      {/* Status buttons — 3×2 grid, touch-friendly */}
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
          <label className="text-sm text-gray-400 block mb-1">Sale Price (optional)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={salePrice}
            onChange={e => setSalePrice(e.target.value)}
            onBlur={() => {
              const num = salePrice === '' ? null : Math.max(0, parseFloat(salePrice));
              onUpdate(item.id, { sale_price: num });
            }}
            placeholder="0.00"
            className="w-full min-h-11 bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-base focus:outline-none focus:border-blue-400"
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
            <label className="text-sm text-gray-400 block mb-1">{label}</label>
            <input
              type="number"
              min="0"
              value={value}
              onChange={e => setter(e.target.value)}
              onBlur={() => {
                const num = value === '' ? null : parseInt(value, 10);
                handleBlur(field, field === 'qty_sold' ? (num ?? 0) : num);
              }}
              className="w-full min-h-11 bg-gray-800 border border-gray-600 rounded-lg px-2 py-2 text-base focus:outline-none focus:border-blue-400"
            />
          </div>
        ))}
      </div>

      {/* Location */}
      <div>
        <label className="text-sm text-gray-400 block mb-1">Shelf / Location</label>
        <input
          type="text"
          value={location}
          onChange={e => setLocation(e.target.value)}
          onBlur={() => handleBlur('shelf_location', location || null)}
          placeholder="e.g. Shelf B2, Back Room"
          className="w-full min-h-11 bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-base focus:outline-none focus:border-blue-400"
        />
      </div>

      {/* Notes */}
      <div>
        <label className="text-sm text-gray-400 block mb-1">Notes</label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          onBlur={() => handleBlur('notes', notes || null)}
          rows={2}
          placeholder="Any notes..."
          className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-base focus:outline-none focus:border-blue-400 resize-none"
        />
      </div>
    </div>
  );
}
