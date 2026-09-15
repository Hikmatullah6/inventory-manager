'use client';
import { useEffect, useRef, useState } from 'react';
import { useItemForm } from '@/hooks/useItemForm';
import { thumbnailSrc } from '@/lib/thumbnail';
import { STATUS_DOT, STATUS_OPTIONS, STATUS_SHORT } from '@/lib/item-status';
import type { Item, ItemStatus, ItemUpdate } from '@/lib/types';

/** 56px row + 1px divider — the stride used to scroll the rail. */
const RAIL_ROW = 57;

/** How long the Saved bar stays up before it fades out of the way. */
const TOAST_MS = 4000;

interface Props {
  /** The current filtered, paged list — the rail and the arrows walk this. */
  items: Item[];
  item: Item;
  onSelect: (id: string) => void;
  onClose: () => void;
  onUpdate: (id: string, update: ItemUpdate) => void;
}

/**
 * The phone detail view: a narrow rail of SKUs on the left so he can see where
 * he is in the list, and every field from the desktop panel reflowed for ~298px
 * on the right. Same screen as the list — no route change, no modal.
 *
 * Keyed on item.id by the caller, so the form and the Saved bar reset per item.
 */
export default function MobileDetailPane({ items, item, onSelect, onClose, onUpdate }: Props) {
  const form = useItemForm(item, onUpdate);
  const railRef = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [toast, setToast] = useState<string | null>(null);
  const [prev, setPrev] = useState<{ status: ItemStatus; salePrice: number | null } | null>(null);

  const index = items.findIndex(i => i.id === item.id);
  const atStart = index <= 0;
  const atEnd = index < 0 || index >= items.length - 1;

  // Keep the selected rail row in view when the arrows move the selection.
  // Deliberately not scrollIntoView: that also scrolls the page behind the rail.
  useEffect(() => {
    const el = railRef.current;
    if (!el || index < 0) return;
    const top = index * RAIL_ROW;
    const outsideBand = top < el.scrollTop || top + RAIL_ROW > el.scrollTop + el.clientHeight;
    if (outsideBand) {
      el.scrollTop = Math.max(0, top - el.clientHeight / 2 + RAIL_ROW / 2);
    }
  }, [index]);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  function chooseStatus(next: ItemStatus) {
    setPrev({
      status: form.status,
      salePrice: form.salePrice === '' ? null : Number(form.salePrice),
    });
    form.handleStatusClick(next);
    setToast(STATUS_SHORT[next]);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { setToast(null); setPrev(null); }, TOAST_MS);
  }

  function undo() {
    if (!prev) return;
    if (timer.current) clearTimeout(timer.current);
    form.restoreStatus(prev.status, prev.salePrice);
    setToast(null);
    setPrev(null);
  }

  function step(delta: number) {
    const next = items[index + delta];
    if (next) onSelect(next.id);
  }

  function commitNumber(field: 'qty_good' | 'qty_broken' | 'qty_sold', raw: string) {
    const parsed = raw === '' ? null : parseInt(raw, 10);
    const value = parsed != null && Number.isFinite(parsed) ? parsed : null;
    form.handleBlur(field, field === 'qty_sold' ? (value ?? 0) : value);
  }

  const photoSrc = thumbnailSrc(item.thumbnail_url);
  const showPhoto = photoSrc && !form.imgError;

  const fieldClass =
    'w-full h-12 bg-gray-800 border border-gray-600 rounded-[10px] px-3 text-base text-white ' +
    'focus:outline-none focus:border-blue-400';

  return (
    <div className="flex-1 min-h-0 flex -mx-4">
      {/* Rail */}
      <div
        ref={railRef}
        className="no-scrollbar flex-none w-[72px] border-r border-gray-700 overflow-y-auto bg-[#0d1521]"
      >
        {items.map(other => {
          const isSelected = other.id === item.id;
          return (
            <button
              key={other.id}
              onClick={() => onSelect(other.id)}
              aria-current={isSelected ? 'true' : undefined}
              style={{ borderLeftColor: isSelected ? '#3b82f6' : 'transparent' }}
              className={`w-full min-h-14 flex flex-col items-center justify-center gap-[5px]
                border-l-[3px] border-b border-b-gray-800 px-1 py-2 transition-colors
                ${isSelected ? 'bg-blue-950' : 'hover:bg-gray-800'}`}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ background: STATUS_DOT[other.status] }}
              />
              <span
                className={`font-mono text-xs font-medium leading-[1.1] ${
                  isSelected ? 'text-blue-300' : 'text-green-400'
                }`}
              >
                {other.sku}
              </span>
            </button>
          );
        })}
      </div>

      {/* Detail */}
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="flex-none flex items-center gap-[6px] px-[10px] py-2 border-b border-gray-700 bg-gray-900">
          <button
            onClick={() => step(-1)}
            disabled={atStart}
            aria-label="Previous item"
            className="flex-none w-11 h-11 rounded-lg bg-gray-800 border border-gray-700 text-white
              text-[17px] hover:bg-gray-700 disabled:opacity-35 disabled:hover:bg-gray-800"
          >
            ↑
          </button>
          <button
            onClick={() => step(1)}
            disabled={atEnd}
            aria-label="Next item"
            className="flex-none w-11 h-11 rounded-lg bg-gray-800 border border-gray-700 text-white
              text-[17px] hover:bg-gray-700 disabled:opacity-35 disabled:hover:bg-gray-800"
          >
            ↓
          </button>
          <span className="flex-1 min-w-0 text-center text-[13px] text-gray-400 whitespace-nowrap">
            {index + 1} of {items.length}
          </span>
          <button
            onClick={onClose}
            aria-label="Back to the list"
            className="flex-none h-11 px-3 rounded-lg bg-gray-800 border border-gray-700
              text-gray-400 text-[15px] hover:text-white hover:bg-gray-700"
          >
            ✕
          </button>
        </div>

        <div className="no-scrollbar flex-1 min-h-0 overflow-y-auto p-[14px] flex flex-col gap-[14px] animate-rise-in">
          {showPhoto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photoSrc}
              alt={item.title}
              onError={() => form.setImgError(true)}
              className="w-full aspect-[4/3] object-contain bg-gray-800 rounded-xl"
            />
          ) : (
            <div className="w-full aspect-[4/3] bg-gray-800 border border-dashed border-gray-600
              rounded-xl flex flex-col items-center justify-center gap-1 text-gray-500">
              <span className="text-[26px]">🖼</span>
              <span className="font-mono text-xs">item photo · {item.sku}</span>
            </div>
          )}

          <div className="flex flex-col gap-[7px]">
            <h2 className="m-0 text-lg font-semibold leading-[1.3] [text-wrap:pretty]">{item.title}</h2>
            <div className="flex flex-wrap gap-[6px]">
              <span className="text-[13px] px-[10px] py-1 rounded-full bg-gray-700 text-gray-200 font-mono">
                {item.sku}
              </span>
              {item.cost != null && (
                <span className="text-[13px] px-[10px] py-1 rounded-full bg-gray-700 text-gray-200">
                  Cost ${item.cost}
                </span>
              )}
              {item.company_name && (
                <span className="text-[13px] px-[10px] py-1 rounded-full bg-gray-700 text-gray-200">
                  {item.company_name}
                </span>
              )}
            </div>
            {item.link && (
              <a
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center h-12 rounded-[10px] border border-blue-600
                  text-blue-400 text-[15px] font-medium no-underline hover:bg-blue-950"
              >
                View original listing ↗
              </a>
            )}
            {item.description && (
              <p className="m-0 text-sm leading-[1.5] text-gray-400 [text-wrap:pretty]">
                {item.description}
              </p>
            )}
          </div>

          {/* The 2px border is always there so selecting does not shift the grid. */}
          <div className="grid grid-cols-2 gap-2">
            {STATUS_OPTIONS.map(opt => {
              const isSelected = form.status === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => chooseStatus(opt.value)}
                  className={`min-h-[52px] rounded-[10px] text-sm font-medium px-1 py-[6px]
                    border-2 transition-colors ${
                      isSelected
                        ? `${opt.color} border-white text-white`
                        : 'bg-gray-700 hover:bg-gray-600 border-transparent text-white'
                    }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          {form.status === 'sold' && (
            <div className="flex flex-col gap-[5px]">
              <label className="text-[13px] text-gray-400">Sale Price</label>
              <input
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={form.salePrice}
                onChange={e => form.setSalePrice(e.target.value)}
                onBlur={() => {
                  const num = form.salePrice === '' ? null : Math.max(0, parseFloat(form.salePrice));
                  form.handleBlur('sale_price', num != null && Number.isFinite(num) ? num : null);
                }}
                placeholder="0.00"
                className={fieldClass}
              />
            </div>
          )}

          <div className="grid grid-cols-3 gap-[7px]">
            {([
              { label: 'Good',   value: form.qtyGood,   set: form.setQtyGood,   field: 'qty_good' as const },
              { label: 'Broken', value: form.qtyBroken, set: form.setQtyBroken, field: 'qty_broken' as const },
              { label: 'Sold',   value: form.qtySold,   set: form.setQtySold,   field: 'qty_sold' as const },
            ]).map(({ label, value, set, field }) => (
              <div key={field} className="min-w-0 flex flex-col gap-[5px]">
                <label className="text-xs text-gray-400">{label}</label>
                <input
                  type="number"
                  min="0"
                  inputMode="numeric"
                  value={value}
                  onChange={e => set(e.target.value)}
                  onBlur={() => commitNumber(field, value)}
                  className={`${fieldClass} px-2 text-center`}
                />
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-[5px]">
            <label className="text-[13px] text-gray-400">Shelf / Location</label>
            <input
              type="text"
              value={form.location}
              onChange={e => form.setLocation(e.target.value)}
              onBlur={() => form.handleBlur('shelf_location', form.location || null)}
              placeholder="e.g. Shelf B2, Back Room"
              className={fieldClass}
            />
          </div>

          <div className="flex flex-col gap-[5px]">
            <label className="text-[13px] text-gray-400">Notes</label>
            <textarea
              rows={3}
              value={form.notes}
              onChange={e => form.setNotes(e.target.value)}
              onBlur={() => form.handleBlur('notes', form.notes || null)}
              placeholder="Any notes..."
              className="w-full bg-gray-800 border border-gray-600 rounded-[10px] px-3 py-[10px]
                text-base text-white resize-none focus:outline-none focus:border-blue-400"
            />
          </div>

          {/* Clears the home indicator. */}
          <div className="h-[26px]" />
        </div>

        {toast && (
          <div className="flex-none mx-[10px] mb-[10px] flex items-center gap-2 bg-blue-950
            border border-blue-600 rounded-[10px] px-[10px] py-2">
            <span className="flex-1 min-w-0 text-[13px] font-medium text-blue-100 truncate">
              Saved · {toast}
            </span>
            <button
              onClick={undo}
              className="flex-none h-9 px-3 rounded-lg border border-blue-600 text-blue-300
                text-[13px] font-medium hover:bg-blue-900"
            >
              Undo
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
