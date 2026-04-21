// src/components/export/ExportButtons.tsx
'use client';

import { useState } from 'react';

interface Props {
  batchId: string;
  inventoryCount: number;
  soldCount: number;
  personalUseCount: number;
}

type Tab = 'inventory' | 'shopify' | 'sold' | 'personal_use';

export default function ExportButtons({ batchId, inventoryCount, soldCount, personalUseCount }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('inventory');

  const tabs: { id: Tab; label: string }[] = [
    { id: 'inventory',    label: 'Inventory'     },
    { id: 'shopify',      label: 'Shopify'       },
    { id: 'sold',         label: 'Sold'          },
    { id: 'personal_use', label: 'Personal Use'  },
  ];

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="flex gap-1 bg-gray-800 rounded-xl p-1">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-gray-700 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab panels */}
      {activeTab === 'inventory' && (
        <div className="space-y-3">
          <p className="text-xs text-gray-400">
            {inventoryCount} items · have it, partial, broken
          </p>
          <a
            href={`/api/export/${batchId}/internal`}
            className="flex items-center justify-between bg-gray-700 hover:bg-gray-600 rounded-xl px-5 py-4 transition-colors"
          >
            <div>
              <p className="font-semibold text-sm">Download Inventory CSV</p>
              <p className="text-xs text-gray-400 mt-0.5">All fields · your full record</p>
            </div>
            <span className="text-gray-400 text-lg">↓</span>
          </a>
        </div>
      )}

      {activeTab === 'shopify' && (
        <div className="space-y-3">
          <p className="text-xs text-gray-400">
            Ready for Shopify import · have it and partial
          </p>
          <a
            href={`/api/export/${batchId}/shopify`}
            className="flex items-center justify-between bg-gray-700 hover:bg-gray-600 rounded-xl px-5 py-4 transition-colors"
          >
            <div>
              <p className="font-semibold text-sm">Download Shopify CSV</p>
              <p className="text-xs text-gray-400 mt-0.5">Shopify columns · ready to import</p>
            </div>
            <span className="text-gray-400 text-lg">↓</span>
          </a>
          <p className="text-xs text-gray-500">
            Price column is left blank — fill before importing to Shopify.
          </p>
        </div>
      )}

      {activeTab === 'sold' && (
        <div className="space-y-3">
          <p className="text-xs text-gray-400">
            {soldCount} sold items · SKU, cost, sale price
          </p>
          <a
            href={`/api/export/${batchId}/sold`}
            className="flex items-center justify-between bg-gray-700 hover:bg-gray-600 rounded-xl px-5 py-4 transition-colors"
          >
            <div>
              <p className="font-semibold text-sm">Download Sold CSV</p>
              <p className="text-xs text-gray-400 mt-0.5">Sold items · SKU, cost, sale price</p>
            </div>
            <span className="text-gray-400 text-lg">↓</span>
          </a>
        </div>
      )}

      {activeTab === 'personal_use' && (
        <div className="space-y-3">
          <p className="text-xs text-gray-400">
            {personalUseCount} personal use items · full record
          </p>
          <a
            href={`/api/export/${batchId}/personal-use`}
            className="flex items-center justify-between bg-gray-700 hover:bg-gray-600 rounded-xl px-5 py-4 transition-colors"
          >
            <div>
              <p className="font-semibold text-sm">Download Personal Use CSV</p>
              <p className="text-xs text-gray-400 mt-0.5">Personal use items · full record</p>
            </div>
            <span className="text-gray-400 text-lg">↓</span>
          </a>
        </div>
      )}
    </div>
  );
}
