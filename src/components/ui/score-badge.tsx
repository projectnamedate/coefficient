import { getScoreBadgeColor, getScoreGlow, getScoreLabel } from "@/lib/grades";

interface ScoreBadgeProps {
  score: number;
  size?: "sm" | "md" | "lg";
}

const sizes = {
  sm: "text-xs px-2.5 py-0.5",
  md: "text-sm px-3 py-1",
  lg: "text-base px-3.5 py-1.5 font-semibold",
};

export function ScoreBadge({ score, size = "md" }: ScoreBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-mono transition-shadow duration-300 ${getScoreBadgeColor(score)} ${sizes[size]}`}
      style={getScoreGlow(score)}
    >
      <span>{score}</span>
      <span className="text-[0.7em] opacity-70">{getScoreLabel(score)}</span>
    </span>
  );
}
