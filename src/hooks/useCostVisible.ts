'use client';
import { useSyncExternalStore } from 'react';

/**
 * Whether what we paid is on screen.
 *
 * The review screen gets walked through with customers standing next to it, so
 * cost starts hidden and is revealed by the eye in the header.
 *
 * **Nothing is persisted, deliberately.** "Hidden by default on every page load"
 * and "remembered in storage" contradict each other — sessionStorage survives a
 * reload in the same tab, so a reload would restore *shown*, which is the one
 * state this must never come back in. A module-level value resets on every full
 * page load while still surviving client-side navigation between /review and
 * /export, which is the behaviour actually wanted.
 *
 * It lives outside React for the same two reasons as useDetailsOpen — both
 * detail components are keyed on `item.id`, so per-component state would reset
 * on every item, and `TableView` renders the phone and desktop layouts at the
 * same time and picks with CSS, so one module-level value keeps them agreeing.
 */
let visible = false;
const subscribers = new Set<() => void>();

function subscribe(fn: () => void) {
  subscribers.add(fn);
  return () => { subscribers.delete(fn); };
}

function snapshot() {
  return visible;
}

export function useCostVisible(): [boolean, (next: boolean) => void] {
  // `false` on the server too, so cost is absent from the HTML and the first
  // paint and can never flash up before anything runs.
  const value = useSyncExternalStore(subscribe, snapshot, () => false);
  return [value, setCostVisible];
}

function setCostVisible(next: boolean) {
  if (next === visible) return;
  visible = next;
  subscribers.forEach(fn => fn());
}
