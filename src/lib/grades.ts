/** Shared grade and score-color utilities. Single source of truth. */

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
  if (s >= 70) return "bg-score-good";
  if (s >= 40) return "bg-score-mid";
  return "bg-score-bad";
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
