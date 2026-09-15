// src/components/Skeleton.tsx
//
// Rendered the instant a link is tapped, while the page's data is still on the
// wire. Without these a tap on Review looks like a button that did nothing.

export function SkeletonBlock({ className = '' }: { className?: string }) {
  return <div className={`bg-gray-800 rounded-lg animate-pulse ${className}`} />;
}

export function HomeSkeleton() {
  return (
    <main className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-2xl mx-auto px-4 py-12 space-y-10">
        <div className="space-y-2">
          <SkeletonBlock className="h-7 w-56" />
          <SkeletonBlock className="h-4 w-72" />
        </div>
        <SkeletonBlock className="h-44 w-full rounded-xl" />
        <div className="space-y-3">
          <SkeletonBlock className="h-3 w-32" />
          <SkeletonBlock className="h-16 w-full rounded-xl" />
          <SkeletonBlock className="h-16 w-full rounded-xl" />
        </div>
      </div>
    </main>
  );
}

export function ReviewSkeleton() {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="border-b border-gray-700 px-4 py-3">
        <div className="max-w-4xl mx-auto space-y-2">
          <SkeletonBlock className="h-5 w-48" />
          <SkeletonBlock className="h-2 w-full rounded-full" />
        </div>
      </div>
      <div className="max-w-4xl mx-auto px-4 py-4 space-y-4">
        <SkeletonBlock className="h-10 w-full" />
        {Array.from({ length: 6 }, (_, i) => (
          <SkeletonBlock key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}

export function ExportSkeleton() {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-2xl mx-auto px-4 py-10 space-y-8">
        <div className="space-y-2">
          <SkeletonBlock className="h-4 w-16" />
          <SkeletonBlock className="h-6 w-56" />
        </div>
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
          {Array.from({ length: 8 }, (_, i) => (
            <SkeletonBlock key={i} className="h-20 w-full" />
          ))}
        </div>
        <SkeletonBlock className="h-12 w-full rounded-xl" />
        <SkeletonBlock className="h-20 w-full rounded-xl" />
      </div>
    </div>
  );
}
