"use client";

import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

/* ── Animated counter (numbers roll up) ───────────────────── */
export function AnimatedCounter({
  value,
  duration = 1.2,
  delay = 0.3,
  suffix = "",
  prefix = "",
  decimals = 0,
}: {
  value: number;
  duration?: number;
  delay?: number;
  suffix?: string;
  prefix?: string;
  decimals?: number;
}) {
  const [display, setDisplay] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const startTime = performance.now() + delay * 1000;

    function tick(now: number) {
      const elapsed = now - startTime;
      if (elapsed < 0) {
        requestAnimationFrame(tick);
        return;
      }
      const progress = Math.min(elapsed / (duration * 1000), 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(eased * value);
      if (progress < 1) requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
  }, [value, duration, delay]);

  return (
    <span>
      {prefix}
      {display.toFixed(decimals)}
      {suffix}
    </span>
  );
}

/* ── Animated score bar ──────────────────────────────────── */
export function AnimatedBar({
  percentage,
  delay = 0,
  colorClass,
}: {
  percentage: number;
  delay?: number;
  colorClass: string;
}) {
  return (
    <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
      <motion.div
        className={`h-full rounded-full ${colorClass}`}
        initial={{ width: 0 }}
        animate={{ width: `${percentage}%` }}
        transition={{
          duration: 0.8,
          delay,
          ease: [0.25, 0.4, 0.25, 1],
        }}
      />
    </div>
  );
}
