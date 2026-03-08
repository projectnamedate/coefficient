interface ScoreBadgeProps {
  score: number;
  size?: "sm" | "md" | "lg";
}

function getScoreColor(score: number): string {
  if (score >= 70) return "bg-score-good/20 text-score-good border-score-good/30";
  if (score >= 40) return "bg-score-mid/20 text-score-mid border-score-mid/30";
  return "bg-score-bad/20 text-score-bad border-score-bad/30";
}

function getGlowStyle(score: number): React.CSSProperties {
  if (score >= 70) return { boxShadow: "0 0 8px rgba(171, 208, 121, 0.1)" };
  if (score >= 40) return { boxShadow: "0 0 8px rgba(238, 229, 110, 0.1)" };
  return { boxShadow: "0 0 8px rgba(174, 72, 69, 0.1)" };
}

function getScoreLabel(score: number): string {
  if (score >= 70) return "Healthy";
  if (score >= 40) return "Mixed";
  return "Concerning";
}

const sizes = {
  sm: "text-xs px-2.5 py-0.5",
  md: "text-sm px-3 py-1",
  lg: "text-base px-3.5 py-1.5 font-semibold",
};

export function ScoreBadge({ score, size = "md" }: ScoreBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-mono transition-shadow duration-300 ${getScoreColor(score)} ${sizes[size]}`}
      style={getGlowStyle(score)}
    >
      <span>{score}</span>
      <span className="text-[0.7em] opacity-70">{getScoreLabel(score)}</span>
    </span>
  );
}
