# Handoff: mobile layout for the review table page

## Scope

**One screen, layout only.** The mobile (`< sm:`) layout of the item list on
`/review/[batchId]` — i.e. `src/components/review/TableView.tsx` and the mobile
half of `ReviewClient.tsx` / `SearchFilter.tsx`.

Explicitly **out of scope** — do not change:

- The colour palette. Every value below is an existing Tailwind class already in
  the codebase (`gray-900`, `gray-800`, `gray-700`, `gray-600`, `gray-400`,
  `green-400`, `blue-600`, `blue-950`, and the seven status pairs from
  `TableView.tsx`'s `STATUS_BADGE`).
- The status vocabulary, labels and glyphs (`STATUS_LABEL` unchanged).
- Any field in `ItemDetail.tsx`. All of them appear in the new detail pane.
- The API, hooks (`useItems`, `useItemUpdate`), pagination, PIN gate, batch
  header, export page, card view.
- **Desktop / tablet (`sm:` and up): unchanged.** Keep the existing
  `flex-row` table + 320px side panel exactly as it is. Everything here lives
  below the `sm:` breakpoint.

## The problem being solved

From `Current Mobile (recreation).dc.html` (a faithful rebuild of today's build):

1. The table is `min-w-[520px]` inside a ~370px viewport, so SKU / Title /
   Status / Good / Sold scroll sideways inside `overflow-auto`. On a phone the
   last three columns are invisible until he drags horizontally.
2. Selecting a row appends the detail panel **below** the list
   (`flex-col sm:flex-row`), so the status buttons are a full list-height scroll
   away, with no scroll or transition to signal it opened.
3. Rows are ~41px tall with 14px type — under the 44px touch minimum, and easy
   to mis-tap.
4. Header + search + two `<select>`s consume ~240px before the first row.

## The design

`Mobile Inventory Redesign.dc.html` is the reference. It is a live prototype —
open it in a browser and click through. Two states:

### State A — list (nothing selected)

No table. Full-width rows in a vertical scroller; nothing scrolls sideways.

- Batch header: back link, batch name, Export button on one 44px row, progress
  bar + `N / M reviewed` below. (Today's three-row stack collapses to two —
  the Table/Cards toggle moves next to Export or into the batch header; it is
  not shown in the prototype because the list *is* the table view.)
- Search field: full width, `height 48px`, `radius 10px`, `bg-gray-800`,
  `border-gray-600`, 16px text, `⌕` glyph at `left 14px` in `gray-500`.
- **Status chips replace the two `<select>`s**: horizontally scrolling row
  (`overflow-x:auto`, scrollbar hidden, `gap 8px`, bled to the screen edges with
  `-16px` margin + `16px` padding). Each chip `height 40px`, `padding 0 14px`,
  pill, 14px/500. Unselected `bg-gray-800` + `1px solid gray-600` + `gray-200`
  text; selected `bg-blue-600` + `border-blue-600` + white. Labels are the
  existing `STATUS_LABEL` values plus a live count: `All · 10`, `⏳ Pending · 5`,
  `✓ Have It · 1`, … Counts come from the server aggregate, not a client array.
  Sort keeps its existing `<select>`, placed to the right of the search field.
- **Item rows**: full-width `<button>`, `min-height 64px`, `bg-gray-800`,
  `1px solid gray-700`, `radius 12px`, `padding 12px 14px`, `gap 12px`,
  `8px` vertical rhythm. Hover `#263243` / `border-gray-600`. Left to right:
  - a 10px status **dot** (see colours below);
  - a column: title 16px/500 single-line truncate, then a meta line with the
    SKU in `green-400` 13px `font-mono` and `good N · sold N`
    (or `not counted` when `qty_good` is null) in 13px `gray-400`;
  - the status pill, 13px, `padding 4px 10px`, using the existing
    `STATUS_BADGE` colours, label shortened (`Have It`, `Broken`, …);
  - a `›` chevron in `gray-500`.
- Pagination controls unchanged, centred under the rows.

### State B — item selected

The list collapses to a **72px left rail**; the detail pane takes the remaining
~298px. Same screen, no route change, no modal.

**Rail** (`width 72px`, `flex:none`, `border-right 1px solid gray-700`,
`background #0d1521`, `overflow-y:auto`, scrollbar hidden):

- One button per item **in the current filtered order**, `min-height 56px`,
  centred column, `gap 5px`, `border-bottom 1px solid gray-800`:
  an 8px status dot above the SKU in 12px/500 `font-mono` `green-400`.
- Selected: `background blue-950` (`#172554`), `border-left 3px solid #3b82f6`,
  SKU in `blue-300`. This is the same highlight the table row uses today.
- Hover `bg-gray-800`.
- When the selection changes via the arrows, scroll the rail so the selected
  row is in view (`scrollTop = index * 57 - clientHeight/2 + 28`, only when it
  is outside the visible band). Do not use `scrollIntoView`.

**Detail pane toolbar** (`flex:none`, `padding 8px 10px`,
`border-bottom 1px solid gray-700`, `bg-gray-900`):

- `↑` and `↓` buttons, `44×44`, `radius 8px`, `bg-gray-800`,
  `1px solid gray-700`. They move to the previous / next item **in the filtered
  list**, in place. Disabled state = `opacity .35` (still rendered).
- `N of M` centred, 13px `gray-400`.
- `✕` button, `height 44px`, `padding 0 12px`, same fill, `gray-400` → white on
  hover. Returns to state A.

**Detail body** (`overflow-y:auto`, `padding 14px`, `gap 14px`, enters with
`riseIn .22s ease` — `opacity 0→1, translateY 6px→0`). Every field from
`ItemDetail.tsx`, reflowed for 298px:

1. Photo — `aspect-ratio 4/3`, `radius 12px`, `object-fit: contain` on
   `thumbnailSrc(item.thumbnail_url)`. Empty/error state is `bg-gray-800` with
   `1px dashed gray-600`, the 🖼 glyph and `item photo · {sku}` in 12px mono.
   (Prototype shows the empty state; production renders the real thumbnail.)
2. Title 18px/600, `text-wrap: pretty`, wrapping — not truncated.
3. Two meta pills, `bg-gray-700` / `gray-200`, 13px, `padding 4px 10px`: SKU
   (mono) and `Cost $N`. `company_name` moves into these when present.
4. `item.link` → full-width anchor styled as a button: `height 48px`,
   `radius 10px`, transparent, `1px solid blue-600`, label `blue-400` 15px/500,
   `View original listing ↗`, hover `bg-blue-950`. Renders only when set.
5. `item.description` — 14px/1.5 `gray-400`, `text-wrap: pretty`.
6. **Status grid** — `grid-cols-2`, `gap 8px`, six buttons `min-height 52px`,
   `radius 10px`, 14px/500. Unselected `bg-gray-700` + white +
   `2px solid transparent`; selected uses the option's existing colour pair from
   `ItemDetail.tsx`'s `STATUS_OPTIONS` plus `2px solid white`. The `2px` border
   is always present so selection does not shift layout (this replaces
   `ring-2 ring-offset`, which clipped inside the narrow pane).
7. Sale price — renders only when status is `sold`. Label 13px `gray-400`,
   input `height 48px`, `radius 10px`, `bg-gray-800`, `border-gray-600`.
8. Quantities — `grid-cols-3`, `gap 7px`, labels `Good` / `Broken` / `Sold`
   12px `gray-400`, inputs `height 48px`, centred 16px text. **Give the grid
   children `min-width: 0`.**
9. Shelf / Location — label + `height 48px` text input,
   placeholder `e.g. Shelf B2, Back Room`.
10. Notes — `rows 3` textarea, `radius 10px`, `resize: none`.
11. `26px` bottom spacer so the last field clears the home indicator.

**Saved + Undo bar** — after a status tap, a bar pinned below the scroller
(`flex:none`, `margin 0 10px 10px`): `bg-blue-950`, `1px solid blue-600`,
`radius 10px`, `padding 8px 10px`; label `Saved · {status}` 13px/500 in
`blue-100`, and an **Undo** button `height 36px`, `padding 0 12px`, pill-ish
`radius 8px`, transparent with `1px solid blue-600`, `blue-300` 13px/500.
Auto-dismisses after **4000ms**. Undo restores the previous status (one level).
**No auto-advance** — he still needs to set quantities and shelf on the same
item.

## Status dot colours

The dots are the 400-weight sibling of the existing badge background, so the
palette does not grow:

| Status | Badge bg (existing) | Dot |
|---|---|---|
| `pending` | `yellow-700` `#a16207` | `#facc15` |
| `have_it` | `green-700` `#15803d` | `#4ade80` |
| `dont_have` | `gray-600` `#4b5563` | `#9ca3af` |
| `broken` | `red-700` `#b91c1c` | `#f87171` |
| `partial` | `orange-700` `#c2410c` | `#fb923c` |
| `sold` | `blue-700` `#1d4ed8` | `#60a5fa` |
| `personal_use` | `purple-700` `#7e22ce` | `#c084fc` |

## Behaviour / state

Local to the review screen; no schema or API change.

```
selectedId: string | null      // null → state A, set → state B
filter:     ItemStatus | 'all' // was the status <select>
search:     string             // unchanged, still debounced 300ms
toast:      string | null      // "Saved · Have It"
prevStatus: { id, status } | null   // one-level undo
```

- Tapping a row sets `selectedId`; `✕` clears it.
- `↑` / `↓` move within the **currently filtered and paged** list only. At
  either end they are inert (`opacity .35`).
- Changing the filter or search while an item is selected: keep the selection if
  the item still matches, otherwise fall back to state A.
- Writes stay optimistic through the existing `useItemUpdate`; the Saved bar is
  local feedback, not a request confirmation. A failed PATCH should still
  surface the existing retry.
- Inputs commit on `blur` as they do today (the prototype uses `onChange` for
  responsiveness in a static demo — keep `onBlur` in production).

## Scale

The list is server-paged already; keep it. The rail renders the same page of
items as the list, so it never exceeds `pageSize` rows — no windowing needed.
At 4,000 items do **not** switch the rail to the full batch.

## Accessibility / touch

- Every tappable element is ≥ 44px: rows 64, rail rows 56, status buttons 52
  (in a 2-col grid with 8px gaps — comfortable), inputs 48, arrows 44.
- Nothing below 12px, and 12px only on the rail SKU and quantity labels.
- `:focus-visible { outline: 2px solid #60a5fa; outline-offset: 2px }`.
- The rail is a list of buttons; give it `role="list"` semantics or plain
  buttons with `aria-current` on the selected one.

## Files

| File | What it is |
|---|---|
| `Mobile Inventory Redesign.dc.html` | The new design. Live prototype, both states, all interactions. Primary reference. |
| `Current Mobile (recreation).dc.html` | Faithful recreation of today's mobile table view, for before/after. |
| `ios-frame.jsx`, `support.js` | Prototype scaffolding. Not part of the design. |

Open either `.dc.html` directly in a browser. Fonts are Geist / Geist Mono from
Google Fonts (the app already uses Geist via `next/font`).

## Note on the previous handoff

This replaces `design_handoff_inventory_redesign/`, which proposed a full
light-theme rebuild of every screen. That direction is dropped: the current dark
palette stays, and only the mobile list layout changes.
