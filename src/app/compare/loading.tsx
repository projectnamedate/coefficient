export default function Loading() {
  return (
    <div>
      <div className="relative overflow-hidden border-b border-white/[0.04]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <div className="h-3 w-24 rounded bg-white/[0.06] shimmer mb-4" />
          <div className="h-12 w-64 rounded bg-white/[0.06] shimmer mb-4" />
          <div className="h-4 w-80 rounded bg-white/[0.04] shimmer" />
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="gradient-border bg-white/[0.02] rounded-xl p-6">
          <div className="h-64 rounded bg-white/[0.03] shimmer" />
        </div>
      </div>
    </div>
  );
}
