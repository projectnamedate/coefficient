export default function FlowsPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-white">Stake Flows</h1>
      <p className="text-beige/50 mt-2 max-w-2xl">
        Visualize how SOL flows from stake pools to validators. See which pools
        feed the superminority vs. support the tail.
      </p>

      <div className="mt-12 flex items-center justify-center h-96 border border-dashed border-white/10 rounded-xl">
        <div className="text-center">
          <p className="text-beige/30 text-lg">Sankey flow diagram</p>
          <p className="text-beige/20 text-sm mt-1">Coming soon</p>
        </div>
      </div>
    </div>
  );
}
