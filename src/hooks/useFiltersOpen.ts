'use client';
import { useEffect, useSyncExternalStore } from 'react';

const KEY = 'review_filters_open';

/**
 * Whether the phone's filter panel is expanded.
 *
 * Sticky across items and visits, like useDetailsOpen: someone working through a
 * customer's request opens it once and should not reopen it after every tap.
 *
 * Module-level rather than component state because `SearchFilter` renders the
 * phone and desktop layouts at once and chooses with CSS. Read after mount,
 * never in a `useState` initializer — the review screen is server-rendered and a
 * storage read during the first render is a hydration mismatch.
 */
let open = false;
let hydrated = false;
const subscribers = new Set<() => void>();

function subscribe(fn: () => void) {
  subscribers.add(fn);
  return () => { subscribers.delete(fn); };
}

function snapshot() {
  return open;
}

function emit() {
  subscribers.forEach(fn => fn());
}

export function useFiltersOpen(): [boolean, (next: boolean) => void] {
  const value = useSyncExternalStore(subscribe, snapshot, () => false);

  useEffect(() => {
    if (hydrated) return;
    hydrated = true;
    try {
      if (localStorage.getItem(KEY) === 'true') {
        open = true;
        emit();
      }
    } catch {}
  }, []);

  return [value, setFiltersOpen];
}

function setFiltersOpen(next: boolean) {
  if (next === open) return;
  open = next;
  try { localStorage.setItem(KEY, String(next)); } catch {}
  emit();
}
