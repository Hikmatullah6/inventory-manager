'use client';
import { useEffect, useSyncExternalStore } from 'react';

const KEY = 'review_details_open';

/**
 * Whether the review card's "Details" section is expanded.
 *
 * It lives outside React because both detail components are keyed on
 * `item.id` — a per-component `useState` would collapse again on every item —
 * and because `TableView` renders the phone and desktop layouts at the same
 * time and chooses with CSS. One module-level value keeps them in agreement.
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

export function useDetailsOpen(): [boolean, (next: boolean) => void] {
  // `false` on the server: ReviewClient is server-rendered, so reading storage
  // during the first render would be a hydration mismatch. The effect below
  // expands it right after mount instead.
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

  return [value, setDetailsOpen];
}

function setDetailsOpen(next: boolean) {
  if (next === open) return;
  open = next;
  try { localStorage.setItem(KEY, String(next)); } catch {}
  emit();
}
