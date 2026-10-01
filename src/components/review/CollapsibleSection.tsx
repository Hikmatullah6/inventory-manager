'use client';
import { ReactNode, useId } from 'react';

interface Props {
  title: string;
  /** How many of the hidden fields already have a value. 0 hides the badge. */
  filledCount: number;
  open: boolean;
  onToggle: (next: boolean) => void;
  children: ReactNode;
}

/**
 * One disclosure for the fields a reviewer rarely touches, so the card stays
 * photo → title → status buttons. Shared by the desktop panel and the phone
 * pane; the open flag is `useDetailsOpen`, not local state.
 */
export default function CollapsibleSection({ title, filledCount, open, onToggle, children }: Props) {
  const bodyId = useId();

  return (
    <div>
      <button
        type="button"
        onClick={() => onToggle(!open)}
        aria-expanded={open}
        aria-controls={bodyId}
        className="w-full min-h-11 flex items-center justify-between gap-2 px-3 rounded-lg
          bg-gray-800 border border-gray-700 text-sm font-medium text-gray-200
          hover:bg-gray-700 transition-colors"
      >
        <span className="flex items-center gap-2 min-w-0">
          <span className="truncate">{title}</span>
          {!open && filledCount > 0 && (
            <span className="flex-none text-sm font-normal text-gray-400">· {filledCount} filled</span>
          )}
        </span>
        <span
          aria-hidden="true"
          className={`flex-none text-gray-400 transition-transform ${open ? 'rotate-90' : ''}`}
        >
          ▸
        </span>
      </button>

      {open && (
        <div id={bodyId} className="mt-3 flex flex-col gap-3">
          {children}
        </div>
      )}
    </div>
  );
}
