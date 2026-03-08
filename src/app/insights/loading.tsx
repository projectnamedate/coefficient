export default function Loading() {
  return (
    <div>
      {/* Hero skeleton */}
      <div className="relative overflow-hidden border-b border-white/[0.04]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <div className="h-3 w-28 rounded bg-white/[0.06] shimmer mb-4" />
          <div className="h-12 w-56 rounded bg-white/[0.06] shimmer mb-4" />
          <div className="h-4 w-72 rounded bg-white/[0.04] shimmer" />
        </div>
      </div>

      {/* Score delta cards skeleton */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="h-3 w-32 rounded bg-white/[0.06] shimmer mb-4" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="gradient-border bg-white/[0.02] rounded-xl p-4">
              <div className="h-2 w-16 rounded bg-white/[0.04] shimmer mb-3" />
              <div className="h-6 w-10 rounded bg-white/[0.06] shimmer mb-2" />
              <div className="h-2 w-12 rounded bg-white/[0.04] shimmer" />
            </div>
          ))}
        </div>
      </div>

      {/* Table skeleton */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <div className="gradient-border bg-white/[0.02] rounded-xl overflow-hidden p-5">
          <div className="h-3 w-36 rounded bg-white/[0.06] shimmer mb-4" />
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="h-4 w-24 rounded bg-white/[0.06] shimmer" />
                <div className="flex-1" />
                <div className="h-4 w-16 rounded bg-white/[0.04] shimmer" />
                <div className="h-4 w-12 rounded bg-white/[0.04] shimmer" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
