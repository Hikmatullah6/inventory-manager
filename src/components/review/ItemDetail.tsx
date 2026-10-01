'use client';
import { Item, ItemUpdate } from '@/lib/types';
import { thumbnailSrc } from '@/lib/thumbnail';
import { STATUS_OPTIONS } from '@/lib/item-status';
import { countFilledDetails, useItemForm } from '@/hooks/useItemForm';
import { useDetailsOpen } from '@/hooks/useDetailsOpen';
import { useCostVisible } from '@/hooks/useCostVisible';
import CollapsibleSection from './CollapsibleSection';
import ChipInput from './ChipInput';
import type { ItemFacets } from '@/lib/types';

interface Props {
  item: Item;
  onUpdate: (id: string, update: ItemUpdate) => void;
  /** Existing values in this batch, offered while editing. */
  facets?: ItemFacets;
}

const FIELD = 'w-full min-h-11 bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-base focus:outline-none focus:border-blue-400';
const LABEL = 'text-sm text-gray-400 block mb-1';

/** Desktop detail panel. Callers key this on item.id. */
export default function ItemDetail({ item, onUpdate, facets }: Props) {
  const form = useItemForm(item, onUpdate);
  const {
    status, title, setTitle, description, setDescription,
    condition, setCondition, quantity, setQuantity,
    price, setPrice, estimatedRetail, setEstimatedRetail,
    season, setSeason, category, setCategory, subcategory, tags,
    location, setLocation, notes, setNotes, salePrice, setSalePrice,
    imgError, setImgError, handleStatusClick,
    commitText, commitNumber, commitList,
  } = form;

  // Everything below the status buttons is one disclosure, so a reviewer who
  // only sets a status never scrolls past it. Open state is shared and sticky.
  const [detailsOpen, setDetailsOpen] = useDetailsOpen();

  // Hidden by default: the screen gets walked through with customers next to it.
  const [costVisible] = useCostVisible();

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

      {/* Title is editable: auction titles are often sloppy. */}
      <div>
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          onBlur={() => { if (title.trim()) commitText('title', title); }}
          aria-label="Title"
          className="w-full min-h-11 bg-transparent border border-transparent hover:border-gray-700
            focus:border-blue-400 rounded-lg px-2 -mx-2 py-1 font-semibold text-base leading-snug
            focus:outline-none focus:bg-gray-800"
        />
        <div className="text-sm text-gray-400 mt-1 flex flex-wrap gap-x-3 gap-y-1 px-0.5">
          <span>SKU: {item.sku}</span>
          {/* The chip stays either way so the layout does not jump on toggle. */}
          {item.cost != null && <span>Cost: {costVisible ? `$${item.cost}` : '•••'}</span>}
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

      {/* The two numbers corrected on the floor, and the one quoted to a
          customer. Both stay out of the disclosure. */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={LABEL}>Quantity</label>
          <input
            type="number"
            min="0"
            step="1"
            value={quantity}
            onChange={e => setQuantity(e.target.value)}
            onBlur={() => commitNumber('quantity', quantity, true)}
            placeholder="—"
            className={FIELD}
          />
        </div>
        <div>
          <label className={LABEL}>Price</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={price}
            onChange={e => setPrice(e.target.value)}
            onBlur={() => commitNumber('price', price)}
            placeholder="0.00"
            className={FIELD}
          />
        </div>
      </div>

      {status === 'sold' && (
        <div>
          <label className={LABEL}>Sale Price (optional)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={salePrice}
            onChange={e => setSalePrice(e.target.value)}
            onBlur={() => commitNumber('sale_price', salePrice)}
            placeholder="0.00"
            className={FIELD}
          />
        </div>
      )}

      <CollapsibleSection
        title="Details"
        filledCount={countFilledDetails(form)}
        open={detailsOpen}
        onToggle={setDetailsOpen}
      >
        <div>
          <label className={LABEL}>Condition</label>
          <input
            type="text"
            value={condition}
            onChange={e => setCondition(e.target.value)}
            onBlur={() => commitText('condition', condition)}
            placeholder="e.g. New, Open box, Damaged"
            className={FIELD}
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={LABEL}>Est. Retail</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={estimatedRetail}
              onChange={e => setEstimatedRetail(e.target.value)}
              onBlur={() => commitNumber('estimated_retail', estimatedRetail)}
              placeholder="0.00"
              className={FIELD}
            />
          </div>
          <div>
            <label className={LABEL}>Season</label>
            <input
              type="text"
              value={season}
              onChange={e => setSeason(e.target.value)}
              onBlur={() => commitText('season', season)}
              list="season-options"
              placeholder="e.g. Winter"
              className={FIELD}
            />
            {facets && facets.seasons.length > 0 && (
              <datalist id="season-options">
                {facets.seasons.map(s => <option key={s} value={s} />)}
              </datalist>
            )}
          </div>
        </div>

        <div>
          <label className={LABEL}>Category</label>
          <input
            type="text"
            value={category}
            onChange={e => setCategory(e.target.value)}
            onBlur={() => commitText('category', category)}
            list="category-options"
            placeholder="e.g. Tools"
            className={FIELD}
          />
          {facets && facets.categories.length > 0 && (
            <datalist id="category-options">
              {facets.categories.map(c => <option key={c} value={c} />)}
            </datalist>
          )}
        </div>

        <ChipInput
          label="Subcategory"
          values={subcategory}
          suggestions={facets?.subcategories}
          placeholder="Add a subcategory"
          onChange={next => commitList('subcategory', next)}
        />

        <ChipInput
          label="Tags"
          values={tags}
          suggestions={facets?.tags}
          placeholder="Add a tag"
          onChange={next => commitList('tags', next)}
        />

        <div>
          <label className={LABEL}>Description</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            onBlur={() => commitText('description', description)}
            rows={3}
            placeholder="Description..."
            className={`${FIELD} resize-none`}
          />
        </div>

        <div>
          <label className={LABEL}>Shelf / Location</label>
          <input
            type="text"
            value={location}
            onChange={e => setLocation(e.target.value)}
            onBlur={() => commitText('shelf_location', location)}
            placeholder="e.g. Shelf B2, Back Room"
            className={FIELD}
          />
        </div>

        <div>
          <label className={LABEL}>Notes</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            onBlur={() => commitText('notes', notes)}
            rows={2}
            placeholder="Any notes..."
            className={`${FIELD} resize-none`}
          />
        </div>
      </CollapsibleSection>
    </div>
  );
}
