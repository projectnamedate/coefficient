/**
 * Formula-based Transparency & Governance Grade
 *
 * Replaces the old manual letter grades with a computed score
 * using data already tracked in pool-overrides.json + validator count from DB.
 *
 * Score = selfDealingScore * 0.45 + mevScore * 0.25 + governanceScore * 0.30
 *
 * mevScore (0-100):
 *   tips=true  + jito=true  + cap exists → 100
 *   tips=true  + jito=true  + no cap     → 90
 *   tips=true  + jito=partial            → 75
 *   tips=true  + jito=unknown            → 60
 *   tips=false + jito=true               → 40
 *   tips=false + jito=partial            → 25
 *   tips=false + jito=unknown            → 10
 *
 * governanceScore = min(validatorCount, 100) — more validators = broader governance
 *
 * Grade thresholds (generous):
 *   A ≥ 80, B ≥ 65, C ≥ 45, D < 45
 */

interface OverrideData {
  selfDealingScore: number;
  mevTipsToStakers: boolean;
  jitoClient: true | "partial" | "unknown";
  mevCommissionCap: number | null;
}

export function computeTransparencyScore(
  override: OverrideData,
  validatorCount: number
): number {
  const { selfDealingScore, mevTipsToStakers, jitoClient, mevCommissionCap } = override;

  // MEV score (0-100)
  let mevScore: number;
  if (mevTipsToStakers) {
    if (jitoClient === true && mevCommissionCap != null) mevScore = 100;
    else if (jitoClient === true) mevScore = 90;
    else if (jitoClient === "partial") mevScore = 75;
    else mevScore = 60;
  } else {
    if (jitoClient === true) mevScore = 40;
    else if (jitoClient === "partial") mevScore = 25;
    else mevScore = 10;
  }

  // Governance score (0-100) — validator set breadth
  const governanceScore = Math.min(validatorCount, 100);

  // Weighted composite
  const score = selfDealingScore * 0.45 + mevScore * 0.25 + governanceScore * 0.30;

  return Math.round(Math.max(0, Math.min(100, score)));
}

export function transparencyGradeFromScore(score: number): string {
  if (score >= 80) return "A";
  if (score >= 65) return "B";
  if (score >= 45) return "C";
  return "D";
}

export function computeTransparencyGrade(
  override: OverrideData,
  validatorCount: number
): { score: number; grade: string } {
  const score = computeTransparencyScore(override, validatorCount);
  return { score, grade: transparencyGradeFromScore(score) };
}
