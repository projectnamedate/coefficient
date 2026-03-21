/** Shared grade and score-color utilities. Single source of truth. */

export type ScoreClass = "good" | "mid" | "bad";

/** Classify a score into good/mid/bad. Use this instead of inline threshold checks. */
export function getScoreClass(score: number): ScoreClass {
  if (score >= 70) return "good";
  if (score >= 40) return "mid";
  return "bad";
}

export function getGrade(score: number): string {
  if (score >= 90) return "A";
  if (score >= 85) return "A-";
  if (score >= 80) return "B+";
  if (score >= 75) return "B";
  if (score >= 70) return "B-";
  if (score >= 65) return "C+";
  if (score >= 60) return "C";
  return "D";
}

/** Tailwind class for score bar color (components). */
export function getBarColor(s: number): string {
  return `bg-score-${getScoreClass(s)}`;
}

/** Tailwind text-color class for a score value. */
export function getScoreTextColor(s: number): string {
  return `text-score-${getScoreClass(s)}`;
}

/** Tailwind text-color class for a letter grade. */
export function getGradeColor(grade: string): string {
  if (grade === "A") return "text-score-good";
  if (grade === "B") return "text-score-mid";
  if (grade === "C") return "text-beige/60";
  return "text-score-bad";
}

/** Hex color for score bar (OG / Satori images). */
export function getBarColorHex(s: number): string {
  if (s >= 70) return "#abd079";
  if (s >= 40) return "#eee56e";
  return "#ae4845";
}

/** Score label for badges. */
export function getScoreLabel(score: number): string {
  if (score >= 70) return "Healthy";
  if (score >= 40) return "Mixed";
  return "Concerning";
}

/** Tailwind classes for score badge styling. */
export function getScoreBadgeColor(score: number): string {
  const cls = getScoreClass(score);
  return `bg-score-${cls}/20 text-score-${cls} border-score-${cls}/30`;
}

/** Glow style for score badges. */
export function getScoreGlow(score: number): React.CSSProperties {
  const colors = { good: "171, 208, 121", mid: "238, 229, 110", bad: "174, 72, 69" };
  return { boxShadow: `0 0 8px rgba(${colors[getScoreClass(score)]}, 0.1)` };
}
