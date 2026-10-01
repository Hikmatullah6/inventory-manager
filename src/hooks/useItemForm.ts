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
  const [qtyGood, setQtyGood] = useState(item.qty_good != null ? String(item.qty_good) : '');
  const [qtyBroken, setQtyBroken] = useState(item.qty_broken != null ? String(item.qty_broken) : '');
  const [qtySold, setQtySold] = useState(String(item.qty_sold));
  const [location, setLocation] = useState(item.shelf_location ?? '');
  const [notes, setNotes] = useState(item.notes ?? '');
  const [salePrice, setSalePrice] = useState(item.sale_price != null ? String(item.sale_price) : '');
  const [imgError, setImgError] = useState(false);

  function handleStatusClick(s: ItemStatus) {
    setStatus(s);
    if (s !== 'sold') {
      // A price only means something while the item is sold.
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

  function handleBlur(field: keyof ItemUpdate, value: string | number | null) {
    onUpdate(item.id, { [field]: value });
  }

  return {
    status, setStatus,
    qtyGood, setQtyGood,
    qtyBroken, setQtyBroken,
    qtySold, setQtySold,
    location, setLocation,
    notes, setNotes,
    salePrice, setSalePrice,
    imgError, setImgError,
    handleStatusClick,
    restoreStatus,
    handleBlur,
  };
}

export type ItemFormState = ReturnType<typeof useItemForm>;

/**
 * How many of the fields behind the collapsed "Details" section already have a
 * value. Read from the live form state, not the row, so the badge updates as
 * soon as an edit is committed. Both layouts show the same number.
 */
export function countFilledDetails(form: ItemFormState, item: Item): number {
  const filled = [
    !!item.description?.trim(),
    form.qtyGood !== '',
    form.qtyBroken !== '',
    form.qtySold !== '' && Number(form.qtySold) > 0,
    form.location.trim() !== '',
    form.notes.trim() !== '',
  ];
  return filled.filter(Boolean).length;
}
