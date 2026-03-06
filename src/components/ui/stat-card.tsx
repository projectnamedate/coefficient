interface StatCardProps {
  label: string;
  value: string;
  subtext?: string;
}

export function StatCard({ label, value, subtext }: StatCardProps) {
  return (
    <div className="group relative bg-white/[0.03] border border-white/[0.06] rounded-lg p-4 hover:border-lavender/20 transition-colors">
      <p className="text-[10px] font-mono text-beige/40 uppercase tracking-wider">
        {label}
      </p>
      <p className="text-2xl font-bold text-white mt-1.5 tabular-nums tracking-tight">
        {value}
      </p>
      {subtext && (
        <p className="text-[11px] text-beige/30 mt-1">{subtext}</p>
      )}
    </div>
  );
}
