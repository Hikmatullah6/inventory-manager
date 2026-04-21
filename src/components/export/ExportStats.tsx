// src/components/export/ExportStats.tsx
interface Stats {
  total: number;
  have_it: number;
  dont_have: number;
  broken: number;
  partial: number;
  pending: number;
  sold: number;
  personal_use: number;
}

export default function ExportStats({ stats }: { stats: Stats }) {
  return (
    <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
      {[
        { label: 'Total',        value: stats.total,        color: 'text-gray-300'   },
        { label: 'Have It',      value: stats.have_it,      color: 'text-green-400'  },
        { label: "Don't Have",   value: stats.dont_have,    color: 'text-gray-400'   },
        { label: 'Broken',       value: stats.broken,       color: 'text-red-400'    },
        { label: 'Partial',      value: stats.partial,      color: 'text-orange-400' },
        { label: 'Pending',      value: stats.pending,      color: 'text-yellow-400' },
        { label: 'Sold',         value: stats.sold,         color: 'text-blue-400'   },
        { label: 'Personal Use', value: stats.personal_use, color: 'text-purple-400' },
      ].map(s => (
        <div key={s.label} className="bg-gray-800 rounded-lg px-3 py-3 text-center">
          <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
        </div>
      ))}
    </div>
  );
}
