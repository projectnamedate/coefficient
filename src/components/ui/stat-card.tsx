"use client";

import { AnimatedCounter } from "./motion";

interface StatCardProps {
  label: string;
  value: string;
  subtext?: string;
  index?: number;
}

export function StatCard({ label, value, subtext, index = 0 }: StatCardProps) {
  // Try to parse numeric value for animation
  const numMatch = value.match(/^([\d.]+)(.*)$/);
  const numericPart = numMatch ? parseFloat(numMatch[1]) : null;
  const suffixPart = numMatch ? numMatch[2] : "";
  const decimals = numMatch?.[1].includes(".") ? numMatch[1].split(".")[1].length : 0;

  return (
    <div className="group relative gradient-border bg-white/[0.03] rounded-lg p-4 hover:bg-white/[0.05] transition-all duration-300 cursor-default">
      <div className="absolute inset-0 rounded-lg bg-lavender/[0.02] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <div className="relative">
        <p className="text-[10px] font-mono text-lavender/50 uppercase tracking-wider">
          {label}
        </p>
        <p className="text-2xl font-bold text-white mt-1.5 tabular-nums tracking-tight">
          {numericPart !== null ? (
            <AnimatedCounter
              value={numericPart}
              suffix={suffixPart}
              decimals={decimals}
              delay={0.2 + index * 0.1}
            />
          ) : (
            value
          )}
        </p>
        {subtext && (
          <p className="text-[11px] text-beige/30 mt-1">{subtext}</p>
        )}
      </div>
    </div>
  );
}
