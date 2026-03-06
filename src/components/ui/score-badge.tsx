interface ScoreBadgeProps {
  score: number;
  size?: "sm" | "md" | "lg";
}

function getScoreColor(score: number): string {
  if (score >= 70) return "bg-score-good/20 text-score-good border-score-good/30";
  if (score >= 40) return "bg-score-mid/20 text-score-mid border-score-mid/30";
  return "bg-score-bad/20 text-score-bad border-score-bad/30";
}

function getGlowClass(score: number): string {
  if (score >= 70) return "glow-score-good";
  if (score >= 40) return "glow-score-mid";
  return "glow-score-bad";
}

function getScoreLabel(score: number): string {
  if (score >= 70) return "Healthy";
  if (score >= 40) return "Mixed";
  return "Concerning";
}

const sizes = {
  sm: "text-xs px-2 py-0.5",
  md: "text-sm px-2.5 py-1",
  lg: "text-base px-3 py-1.5 font-semibold",
};

export function ScoreBadge({ score, size = "md" }: ScoreBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-mono transition-shadow duration-300 hover:${getGlowClass(score)} ${getScoreColor(score)} ${sizes[size]}`}
    >
      <span>{score}</span>
      <span className="text-[0.7em] opacity-70">{getScoreLabel(score)}</span>
    </span>
  );
}
