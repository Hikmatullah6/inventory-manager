'use client';
import { STATUS_BADGE, STATUS_DOT, STATUS_SHORT } from '@/lib/item-status';
import type { Item } from '@/lib/types';

/** "qty 3 · $39.99" — the count and the asking price, the two numbers the row
 *  is scanned for. Cost is never here: it is hidden by default. */
function metaLabel(item: Item) {
  const parts: string[] = [];
  if (item.quantity != null) parts.push(`qty ${item.quantity}`);
  if (item.price != null) parts.push(`$${item.price}`);
  return parts.length > 0 ? parts.join(' · ') : 'no qty';
}

/**
 * The phone list. No table and no horizontal scrolling: one full-width row per
 * item, each tall enough to hit without looking.
 */
export default function MobileItemList({ items, onSelect }: {
  items: Item[];
  onSelect: (id: string) => void;
}) {
  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      {items.map(item => (
        <button
          key={item.id}
          onClick={() => onSelect(item.id)}
          className="w-full min-h-16 mb-2 flex items-center gap-3 text-left text-white
            bg-gray-800 border border-gray-700 rounded-xl px-[14px] py-3
            transition-colors hover:bg-gray-700 hover:border-gray-600"
        >
          <span
            className="flex-none w-[10px] h-[10px] rounded-full"
            style={{ background: STATUS_DOT[item.status] }}
          />
          <span className="flex-1 min-w-0 flex flex-col gap-[3px]">
            <span className="text-base font-medium leading-[1.3] truncate">{item.title}</span>
            <span className="flex gap-[10px] items-baseline">
              <span className="font-mono text-[13px] text-green-400">{item.sku}</span>
              <span className="text-[13px] text-gray-400">{metaLabel(item)}</span>
            </span>
          </span>
          <span
            className={`flex-none text-[13px] px-[10px] py-1 rounded-full whitespace-nowrap ${STATUS_BADGE[item.status]}`}
          >
            {STATUS_SHORT[item.status]}
          </span>
          <span className="flex-none text-gray-500 text-[13px]">›</span>
        </button>
      ))}
    </div>
  );
}
