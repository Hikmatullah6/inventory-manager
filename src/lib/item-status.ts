// src/lib/item-status.ts
//
// Status vocabulary, labels and colours — shared by the desktop table, the
// mobile list, the mobile detail pane and the card view so they cannot drift.

import type { ItemStatus } from './types';

/** Full labels, with the glyphs the app has always used. */
export const STATUS_LABEL: Record<ItemStatus, string> = {
  pending:      '⏳ Pending',
  have_it:      '✓ Have It',
  dont_have:    "✗ Don't Have",
  broken:       '⚠ Broken',
  partial:      '⅟ Partial',
  sold:         '$ Sold',
  personal_use: '♥ Personal Use',
};

/** Glyph-free labels, for the pill on a narrow list row. */
export const STATUS_SHORT: Record<ItemStatus, string> = {
  pending:      'Pending',
  have_it:      'Have It',
  dont_have:    "Don't Have",
  broken:       'Broken',
  partial:      'Partial',
  sold:         'Sold',
  personal_use: 'Personal Use',
};

export const STATUS_BADGE: Record<ItemStatus, string> = {
  pending:      'bg-yellow-700 text-yellow-100',
  have_it:      'bg-green-700 text-green-100',
  dont_have:    'bg-gray-600 text-gray-200',
  broken:       'bg-red-700 text-red-100',
  partial:      'bg-orange-700 text-orange-100',
  sold:         'bg-blue-700 text-blue-100',
  personal_use: 'bg-purple-700 text-purple-100',
};

/**
 * The 400-weight sibling of each badge background. Used for the dot on a mobile
 * row and in the rail, where a full pill would not fit — no new palette.
 */
export const STATUS_DOT: Record<ItemStatus, string> = {
  pending:      '#facc15',
  have_it:      '#4ade80',
  dont_have:    '#9ca3af',
  broken:       '#f87171',
  partial:      '#fb923c',
  sold:         '#60a5fa',
  personal_use: '#c084fc',
};

/** The six choices offered on an item, in the order they are shown. */
export const STATUS_OPTIONS: { value: ItemStatus; label: string; color: string }[] = [
  { value: 'have_it',      label: '✓ Have It',        color: 'bg-green-700 hover:bg-green-600'   },
  { value: 'dont_have',    label: "✗ Don't Have",     color: 'bg-gray-600 hover:bg-gray-500'     },
  { value: 'broken',       label: '⚠ Broken',          color: 'bg-red-700 hover:bg-red-600'       },
  { value: 'partial',      label: '⅟ Partial',         color: 'bg-orange-700 hover:bg-orange-600' },
  { value: 'sold',         label: '$ Sold',            color: 'bg-blue-700 hover:bg-blue-600'     },
  { value: 'personal_use', label: '♥ Personal Use',   color: 'bg-purple-700 hover:bg-purple-600' },
];

/** Order of the filter chips: everything, then unchecked, then the rest. */
export const FILTER_ORDER: (ItemStatus | 'all')[] = [
  'all', 'pending', 'have_it', 'dont_have', 'broken', 'partial', 'sold', 'personal_use',
];
