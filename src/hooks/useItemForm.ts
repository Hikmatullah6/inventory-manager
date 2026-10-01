'use client';
import { useState } from 'react';
import { Item, ItemStatus, ItemUpdate } from '@/lib/types';

/**
 * The editable state of one item, shared by the desktop detail panel and the
 * mobile detail pane. The two lay their fields out very differently; the rules
 * for what a change means are identical, and live here.
 *
 * Callers must key the component on `item.id`, so a new item starts from fresh
 * state rather than needing a resync effect.
 */
export function useItemForm(item: Item, onUpdate: (id: string, update: ItemUpdate) => void) {
  const [status, setStatus] = useState<ItemStatus>(item.status);
  const [title, setTitle] = useState(item.title);
  const [description, setDescription] = useState(item.description ?? '');
  const [condition, setCondition] = useState(item.condition ?? '');
  const [quantity, setQuantity] = useState(item.quantity != null ? String(item.quantity) : '');
  const [price, setPrice] = useState(item.price != null ? String(item.price) : '');
  const [estimatedRetail, setEstimatedRetail] = useState(
    item.estimated_retail != null ? String(item.estimated_retail) : ''
  );
  const [season, setSeason] = useState(item.season ?? '');
  const [category, setCategory] = useState(item.category ?? '');
  const [subcategory, setSubcategory] = useState<string[]>(item.subcategory);
  const [tags, setTags] = useState<string[]>(item.tags);
  const [location, setLocation] = useState(item.shelf_location ?? '');
  const [notes, setNotes] = useState(item.notes ?? '');
  const [salePrice, setSalePrice] = useState(item.sale_price != null ? String(item.sale_price) : '');
  const [imgError, setImgError] = useState(false);

  function handleStatusClick(s: ItemStatus) {
    setStatus(s);
    if (s !== 'sold') {
      // A sale price only means something while the item is sold.
      setSalePrice('');
      onUpdate(item.id, { status: s, sale_price: null });
    } else {
      onUpdate(item.id, { status: s });
    }
  }

  /** Undo: put back the status *and* the price the status change cleared. */
  function restoreStatus(s: ItemStatus, price: number | null) {
    setStatus(s);
    setSalePrice(price != null ? String(price) : '');
    onUpdate(item.id, { status: s, sale_price: price });
  }

  function handleBlur(field: keyof ItemUpdate, value: string | number | string[] | null) {
    onUpdate(item.id, { [field]: value });
  }

  /** A text field: commit the trimmed value, or null when it is emptied. */
  function commitText(field: keyof ItemUpdate, value: string) {
    handleBlur(field, value.trim() || null);
  }

  /** A number field: never send NaN to a numeric column. */
  function commitNumber(field: keyof ItemUpdate, value: string, integer = false) {
    const raw = value.trim();
    if (!raw) return handleBlur(field, null);
    const n = integer ? parseInt(raw, 10) : parseFloat(raw);
    handleBlur(field, Number.isFinite(n) ? n : null);
  }

  /**
   * Multi-value chips: the whole array goes in one write, and an emptied field
   * writes `[]` rather than null — the columns are NOT NULL DEFAULT '{}'.
   */
  function commitList(field: 'subcategory' | 'tags', next: string[]) {
    if (field === 'subcategory') setSubcategory(next); else setTags(next);
    handleBlur(field, next);
  }

  return {
    status, setStatus,
    title, setTitle,
    description, setDescription,
    condition, setCondition,
    quantity, setQuantity,
    price, setPrice,
    estimatedRetail, setEstimatedRetail,
    season, setSeason,
    category, setCategory,
    subcategory, tags,
    location, setLocation,
    notes, setNotes,
    salePrice, setSalePrice,
    imgError, setImgError,
    handleStatusClick,
    restoreStatus,
    handleBlur,
    commitText,
    commitNumber,
    commitList,
  };
}

export type ItemFormState = ReturnType<typeof useItemForm>;

/**
 * How many of the fields behind the collapsed "Details" section already have a
 * value. Read from the live form state, not the row, so the badge updates as
 * soon as an edit is committed. Both layouts show the same number.
 */
export function countFilledDetails(form: ItemFormState): number {
  const filled = [
    form.description.trim() !== '',
    form.condition.trim() !== '',
    form.price !== '',
    form.estimatedRetail !== '',
    form.season.trim() !== '',
    form.category.trim() !== '',
    form.subcategory.length > 0,
    form.tags.length > 0,
    form.location.trim() !== '',
    form.notes.trim() !== '',
  ];
  return filled.filter(Boolean).length;
}
