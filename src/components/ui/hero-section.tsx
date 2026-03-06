"use client";

import { motion } from "framer-motion";

interface HeroSectionProps {
  eyebrow: string;
  title: string;
  accent: string;
  description: string;
  gradient?: "lavender" | "info" | "green";
}

const gradientConfig = {
  lavender: {
    bg: "from-lavender/[0.08] via-transparent to-info/[0.04]",
    orb1: "bg-lavender/[0.06]",
    orb2: "bg-info/[0.03]",
  },
  info: {
    bg: "from-info/[0.08] via-transparent to-lavender/[0.04]",
    orb1: "bg-info/[0.06]",
    orb2: "bg-lavender/[0.03]",
  },
  green: {
    bg: "from-score-good/[0.05] via-transparent to-lavender/[0.06]",
    orb1: "bg-score-good/[0.04]",
    orb2: "bg-lavender/[0.04]",
  },
};

export function HeroSection({
  eyebrow,
  title,
  accent,
  description,
  gradient = "lavender",
}: HeroSectionProps) {
  const g = gradientConfig[gradient];

  return (
    <div className="relative overflow-hidden border-b border-white/[0.04] noise-overlay">
      {/* Animated gradient background */}
      <div className={`absolute inset-0 bg-gradient-to-br ${g.bg}`} />

      {/* Floating orbs */}
      <div className={`hero-orb top-[-20%] right-[-5%] w-[500px] h-[500px] ${g.orb1}`} />
      <div className={`hero-orb bottom-[-30%] left-[-10%] w-[400px] h-[400px] ${g.orb2}`} style={{ animationDelay: "-5s" }} />

      {/* Content */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="text-xs font-mono text-lavender/60 uppercase tracking-[0.2em] mb-3"
        >
          {eyebrow}
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15, ease: [0.25, 0.4, 0.25, 1] }}
          className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-[1.1] tracking-tight"
        >
          {title}
          <br />
          <span className="text-lavender">{accent}</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.25 }}
          className="text-beige/40 mt-5 max-w-lg leading-relaxed text-[15px]"
        >
          {description}
        </motion.p>
      </div>
    </div>
  );
}
