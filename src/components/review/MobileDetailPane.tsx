'use client';
import { useEffect, useRef, useState } from 'react';
import { countFilledDetails, useItemForm } from '@/hooks/useItemForm';
import { useDetailsOpen } from '@/hooks/useDetailsOpen';
import { useCostVisible } from '@/hooks/useCostVisible';
import CollapsibleSection from './CollapsibleSection';
import ChipInput from './ChipInput';
import { thumbnailSrc } from '@/lib/thumbnail';
import { STATUS_DOT, STATUS_OPTIONS, STATUS_SHORT } from '@/lib/item-status';
import type { Item, ItemFacets, ItemStatus, ItemUpdate } from '@/lib/types';

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
  /** Existing values in this batch, offered while editing. */
  facets?: ItemFacets;
}

/**
 * The phone detail view: a narrow rail of SKUs on the left so he can see where
 * he is in the list, and every field from the desktop panel reflowed for ~298px
 * on the right. Same screen as the list — no route change, no modal.
 *
 * Keyed on item.id by the caller, so the form and the Saved bar reset per item.
 */
export default function MobileDetailPane({ items, item, onSelect, onClose, onUpdate, facets }: Props) {
  const form = useItemForm(item, onUpdate);
  // Everything below the status buttons is one disclosure, so marking an item
  // takes no scrolling. The open flag is shared and sticky across items.
  const [detailsOpen, setDetailsOpen] = useDetailsOpen();
  // Hidden by default: the phone gets handed around in front of customers.
  const [costVisible] = useCostVisible();
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
            {/* Editable in place: auction titles are often sloppy. */}
            <textarea
              rows={2}
              value={form.title}
              onChange={e => form.setTitle(e.target.value)}
              onBlur={() => { if (form.title.trim()) form.commitText('title', form.title); }}
              aria-label="Title"
              className="w-full m-0 bg-transparent border border-transparent focus:border-blue-400
                focus:bg-gray-800 rounded-[10px] px-2 -mx-2 py-1 text-lg font-semibold leading-[1.3]
                text-white resize-none focus:outline-none"
            />
            <div className="flex flex-wrap gap-[6px]">
              <span className="text-[13px] px-[10px] py-1 rounded-full bg-gray-700 text-gray-200 font-mono">
                {item.sku}
              </span>
              {/* The pill stays either way so the row does not reflow on toggle. */}
              {item.cost != null && (
                <span className="text-[13px] px-[10px] py-1 rounded-full bg-gray-700 text-gray-200">
                  Cost {costVisible ? `$${item.cost}` : '•••'}
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

          {/* The count corrected on the floor, and the number quoted to a
              customer. Both stay out of the disclosure. */}
          <div className="grid grid-cols-2 gap-[7px]">
            <div className="min-w-0 flex flex-col gap-[5px]">
              <label className="text-[13px] text-gray-400">Quantity</label>
              <input
                type="number"
                min="0"
                step="1"
                inputMode="numeric"
                value={form.quantity}
                onChange={e => form.setQuantity(e.target.value)}
                onBlur={() => form.commitNumber('quantity', form.quantity, true)}
                placeholder="—"
                className={`${fieldClass} px-2 text-center`}
              />
            </div>
            <div className="min-w-0 flex flex-col gap-[5px]">
              <label className="text-[13px] text-gray-400">Price</label>
              <input
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={form.price}
                onChange={e => form.setPrice(e.target.value)}
                onBlur={() => form.commitNumber('price', form.price)}
                placeholder="0.00"
                className={`${fieldClass} px-2 text-center`}
              />
            </div>
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
                onBlur={() => form.commitNumber('sale_price', form.salePrice)}
                placeholder="0.00"
                className={fieldClass}
              />
            </div>
          )}

          <CollapsibleSection
            title="Details"
            filledCount={countFilledDetails(form)}
            open={detailsOpen}
            onToggle={setDetailsOpen}
          >
            <div className="flex flex-col gap-[5px]">
              <label className="text-[13px] text-gray-400">Condition</label>
              <input
                type="text"
                value={form.condition}
                onChange={e => form.setCondition(e.target.value)}
                onBlur={() => form.commitText('condition', form.condition)}
                placeholder="e.g. New, Open box"
                className={fieldClass}
              />
            </div>

            <div className="grid grid-cols-2 gap-[7px]">
              <div className="min-w-0 flex flex-col gap-[5px]">
                <label className="text-[13px] text-gray-400">Est. Retail</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  value={form.estimatedRetail}
                  onChange={e => form.setEstimatedRetail(e.target.value)}
                  onBlur={() => form.commitNumber('estimated_retail', form.estimatedRetail)}
                  placeholder="0.00"
                  className={`${fieldClass} px-2 text-center`}
                />
              </div>
              <div className="min-w-0 flex flex-col gap-[5px]">
                <label className="text-[13px] text-gray-400">Season</label>
                <input
                  type="text"
                  value={form.season}
                  onChange={e => form.setSeason(e.target.value)}
                  onBlur={() => form.commitText('season', form.season)}
                  placeholder="e.g. Winter"
                  className={`${fieldClass} px-2`}
                />
              </div>
            </div>

            <div className="flex flex-col gap-[5px]">
              <label className="text-[13px] text-gray-400">Category</label>
              <input
                type="text"
                value={form.category}
                onChange={e => form.setCategory(e.target.value)}
                onBlur={() => form.commitText('category', form.category)}
                placeholder="e.g. Tools"
                className={fieldClass}
              />
            </div>

            <ChipInput
              label="Subcategory"
              values={form.subcategory}
              suggestions={facets?.subcategories}
              placeholder="Add a subcategory"
              onChange={next => form.commitList('subcategory', next)}
            />

            <ChipInput
              label="Tags"
              values={form.tags}
              suggestions={facets?.tags}
              placeholder="Add a tag"
              onChange={next => form.commitList('tags', next)}
            />

            <div className="flex flex-col gap-[5px]">
              <label className="text-[13px] text-gray-400">Description</label>
              <textarea
                rows={3}
                value={form.description}
                onChange={e => form.setDescription(e.target.value)}
                onBlur={() => form.commitText('description', form.description)}
                placeholder="Description..."
                className="w-full bg-gray-800 border border-gray-600 rounded-[10px] px-3 py-[10px]
                  text-base text-white resize-none focus:outline-none focus:border-blue-400"
              />
            </div>

            <div className="flex flex-col gap-[5px]">
              <label className="text-[13px] text-gray-400">Shelf / Location</label>
              <input
                type="text"
                value={form.location}
                onChange={e => form.setLocation(e.target.value)}
                onBlur={() => form.commitText('shelf_location', form.location)}
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
                onBlur={() => form.commitText('notes', form.notes)}
                placeholder="Any notes..."
                className="w-full bg-gray-800 border border-gray-600 rounded-[10px] px-3 py-[10px]
                  text-base text-white resize-none focus:outline-none focus:border-blue-400"
              />
            </div>
          </CollapsibleSection>

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
