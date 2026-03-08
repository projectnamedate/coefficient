export default function Loading() {
  return (
    <div>
      {/* Hero skeleton */}
      <div className="relative overflow-hidden border-b border-white/[0.04]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <div className="h-3 w-36 rounded bg-white/[0.06] shimmer mb-4" />
          <div className="h-12 w-48 rounded bg-white/[0.06] shimmer mb-4" />
          <div className="h-4 w-64 rounded bg-white/[0.04] shimmer" />
        </div>
      </div>

      {/* Score cards skeleton */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Radar placeholder */}
          <div className="gradient-border bg-white/[0.02] rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="h-3 w-28 rounded bg-white/[0.06] shimmer" />
              <div className="h-8 w-20 rounded-full bg-white/[0.04] shimmer" />
            </div>
            <div className="h-52 rounded bg-white/[0.03] shimmer" />
          </div>
          {/* Score bars placeholder */}
          <div className="gradient-border bg-white/[0.02] rounded-xl p-6">
            <div className="h-3 w-28 rounded bg-white/[0.06] shimmer mb-6" />
            <div className="space-y-4">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i}>
                  <div className="flex justify-between mb-1">
                    <div className="h-2 w-24 rounded bg-white/[0.04] shimmer" />
                    <div className="h-2 w-8 rounded bg-white/[0.04] shimmer" />
                  </div>
                  <div className="h-2 rounded-full bg-white/[0.05] shimmer" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* History chart skeleton */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-6">
        <div className="gradient-border bg-white/[0.02] rounded-xl p-6">
          <div className="h-3 w-24 rounded bg-white/[0.06] shimmer mb-4" />
          <div className="h-40 rounded bg-white/[0.03] shimmer" />
        </div>
      </div>

      {/* Validators table skeleton */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <div className="gradient-border bg-white/[0.02] rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-white/5">
            <div className="h-3 w-36 rounded bg-white/[0.06] shimmer" />
          </div>
          <div className="p-4 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="h-4 w-6 rounded bg-white/[0.04] shimmer" />
                <div className="h-4 w-36 rounded bg-white/[0.06] shimmer" />
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
