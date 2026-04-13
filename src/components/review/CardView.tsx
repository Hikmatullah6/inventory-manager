'use client';
import { Item, ItemUpdate } from '@/lib/types';
import ItemDetail from './ItemDetail';

interface Props {
  items: Item[];
  currentIndex: number;
  total: number;
  onNavigate: (index: number) => void;
  onUpdate: (id: string, update: ItemUpdate) => void;
}

export default function CardView({ items, currentIndex, total, onNavigate, onUpdate }: Props) {
  const item = items[currentIndex];

  if (!item) return (
    <div className="flex items-center justify-center h-64 text-gray-500">
      <p>No items to review</p>
    </div>
  );

  return (
    <div className="space-y-4">
      <ItemDetail item={item} onUpdate={onUpdate} />

      <div className="flex items-center justify-between pt-2 border-t border-gray-700">
        <button
          onClick={() => onNavigate(currentIndex - 1)}
          disabled={currentIndex === 0}
          className="px-6 py-3 bg-gray-700 hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors"
        >
          ← Prev
        </button>
        <span className="text-xs text-gray-500">{currentIndex + 1} of {total}</span>
        <button
          onClick={() => onNavigate(currentIndex + 1)}
          disabled={currentIndex >= total - 1}
          className="px-6 py-3 bg-blue-700 hover:bg-blue-600 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors"
        >
          Next →
        </button>
      </div>
    </div>
  );
}
