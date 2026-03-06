import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "./schema";

const client = createClient({ url: "file:./data/coefficient.db" });
const db = drizzle(client, { schema });

const CURRENT_EPOCH = 780;
const now = new Date().toISOString();

const pools = [
  { id: "jito", name: "Jito", lstTicker: "JitoSOL", program: "spl-stake-pool", selfDealing: false },
  { id: "doublezero", name: "DoubleZero", lstTicker: "dzSOL", program: "spl-stake-pool", selfDealing: false },
  { id: "blazestake", name: "BlazeStake", lstTicker: "bSOL", program: "spl-stake-pool", selfDealing: false },
  { id: "jpool", name: "JPool", lstTicker: "JSOL", program: "spl-stake-pool", selfDealing: false },
  { id: "phase", name: "Phase Delegate", lstTicker: "pdSOL", program: "spl-stake-pool", selfDealing: false },
  { id: "vault", name: "Vault", lstTicker: "vSOL", program: "spl-stake-pool", selfDealing: true, selfDealingNotes: "Validators must buy $V tokens and stake through vSOL to qualify for delegation" },
  { id: "dynosol", name: "dynoSOL", lstTicker: "dynoSOL", program: "spl-stake-pool", selfDealing: false },
  { id: "jagpool", name: "JagPool", lstTicker: "jagSOL", program: "spl-stake-pool", selfDealing: false },
  { id: "stke", name: "STKE", lstTicker: "STKESOL", program: "spl-stake-pool", selfDealing: false },
  { id: "marinade", name: "Marinade", lstTicker: "mSOL", program: "marinade", selfDealing: false },
  { id: "shinobi", name: "Shinobi", lstTicker: "xSHIN", program: "spl-stake-pool", selfDealing: false },
  { id: "edgevana", name: "Edgevana", lstTicker: "edgeSOL", program: "spl-stake-pool", selfDealing: false },
  { id: "definity", name: "Definity", lstTicker: "definSOL", program: "sanctum-multi", selfDealing: false },
  { id: "indiesol", name: "IndieSOL", lstTicker: "IndieSOL", program: "spl-stake-pool", selfDealing: false },
];

const scores = [
  { poolId: "jito", networkHealthScore: 68, smallValidatorBias: 55, selfDealing: 90, mevSandwichPolicy: 75, nakamotoImpact: 60, validatorSetSize: 95, geographicDiversity: 70, commissionDiscipline: 80, transparency: 85, activeSolStaked: 12788407, validatorCount: 325, medianApy: 5.97 },
  { poolId: "doublezero", networkHealthScore: 62, smallValidatorBias: 50, selfDealing: 70, mevSandwichPolicy: 80, nakamotoImpact: 55, validatorSetSize: 93, geographicDiversity: 65, commissionDiscipline: 70, transparency: 60, activeSolStaked: 13357851, validatorCount: 318, medianApy: 5.62 },
  { poolId: "blazestake", networkHealthScore: 78, smallValidatorBias: 82, selfDealing: 95, mevSandwichPolicy: 85, nakamotoImpact: 75, validatorSetSize: 88, geographicDiversity: 72, commissionDiscipline: 75, transparency: 80, activeSolStaked: 1031679, validatorCount: 234, medianApy: 5.72 },
  { poolId: "jpool", networkHealthScore: 74, smallValidatorBias: 75, selfDealing: 90, mevSandwichPolicy: 80, nakamotoImpact: 70, validatorSetSize: 85, geographicDiversity: 68, commissionDiscipline: 72, transparency: 75, activeSolStaked: 1250759, validatorCount: 217, medianApy: 5.78 },
  { poolId: "phase", networkHealthScore: 88, smallValidatorBias: 95, selfDealing: 100, mevSandwichPolicy: 90, nakamotoImpact: 88, validatorSetSize: 78, geographicDiversity: 80, commissionDiscipline: 82, transparency: 85, activeSolStaked: 1068321, validatorCount: 163, medianApy: 5.68 },
  { poolId: "vault", networkHealthScore: 35, smallValidatorBias: 45, selfDealing: 10, mevSandwichPolicy: 60, nakamotoImpact: 40, validatorSetSize: 65, geographicDiversity: 50, commissionDiscipline: 30, transparency: 25, activeSolStaked: 1249140, validatorCount: 121, medianApy: 5.82 },
  { poolId: "dynosol", networkHealthScore: 65, smallValidatorBias: 70, selfDealing: 85, mevSandwichPolicy: 65, nakamotoImpact: 60, validatorSetSize: 55, geographicDiversity: 58, commissionDiscipline: 68, transparency: 50, activeSolStaked: 523576, validatorCount: 76, medianApy: 5.81 },
  { poolId: "jagpool", networkHealthScore: 80, smallValidatorBias: 85, selfDealing: 95, mevSandwichPolicy: 78, nakamotoImpact: 80, validatorSetSize: 55, geographicDiversity: 90, commissionDiscipline: 75, transparency: 70, activeSolStaked: 744077, validatorCount: 75, medianApy: 5.75 },
  { poolId: "stke", networkHealthScore: 62, smallValidatorBias: 65, selfDealing: 80, mevSandwichPolicy: 60, nakamotoImpact: 58, validatorSetSize: 50, geographicDiversity: 55, commissionDiscipline: 65, transparency: 55, activeSolStaked: 689479, validatorCount: 66, medianApy: 5.75 },
  { poolId: "marinade", networkHealthScore: 52, smallValidatorBias: 50, selfDealing: 75, mevSandwichPolicy: 30, nakamotoImpact: 55, validatorSetSize: 45, geographicDiversity: 60, commissionDiscipline: 70, transparency: 65, activeSolStaked: 2888186, validatorCount: 57, medianApy: 5.86 },
  { poolId: "shinobi", networkHealthScore: 66, smallValidatorBias: 60, selfDealing: 85, mevSandwichPolicy: 75, nakamotoImpact: 62, validatorSetSize: 45, geographicDiversity: 60, commissionDiscipline: 78, transparency: 70, activeSolStaked: 1096471, validatorCount: 55, medianApy: 5.65 },
  { poolId: "edgevana", networkHealthScore: 48, smallValidatorBias: 40, selfDealing: 50, mevSandwichPolicy: 70, nakamotoImpact: 45, validatorSetSize: 40, geographicDiversity: 35, commissionDiscipline: 72, transparency: 60, activeSolStaked: 828375, validatorCount: 48, medianApy: 5.75 },
  { poolId: "definity", networkHealthScore: 72, smallValidatorBias: 78, selfDealing: 90, mevSandwichPolicy: 75, nakamotoImpact: 70, validatorSetSize: 30, geographicDiversity: 85, commissionDiscipline: 70, transparency: 65, activeSolStaked: 261604, validatorCount: 25, medianApy: 5.78 },
  { poolId: "indiesol", networkHealthScore: 70, smallValidatorBias: 88, selfDealing: 95, mevSandwichPolicy: 65, nakamotoImpact: 65, validatorSetSize: 28, geographicDiversity: 55, commissionDiscipline: 70, transparency: 60, activeSolStaked: 974, validatorCount: 22, medianApy: 6.53 },
];

async function seed() {
  console.log("Seeding database...");

  // Insert epoch
  await db.insert(schema.epochs).values({
    epochNumber: CURRENT_EPOCH,
    startSlot: 337_440_000,
    startedAt: now,
    totalStake: 388_000_000,
    nakamotoCoefficient: 19,
  }).onConflictDoNothing();

  // Insert pools
  for (const pool of pools) {
    await db.insert(schema.stakePools).values({
      id: pool.id,
      name: pool.name,
      lstTicker: pool.lstTicker,
      program: pool.program,
      selfDealingFlag: pool.selfDealing,
      selfDealingNotes: (pool as any).selfDealingNotes,
      createdAt: now,
    }).onConflictDoNothing();
  }

  // Insert scores
  for (const score of scores) {
    await db.insert(schema.poolScores).values({
      epochNumber: CURRENT_EPOCH,
      ...score,
    }).onConflictDoNothing();
  }

  console.log(`Seeded ${pools.length} pools and ${scores.length} score records for epoch ${CURRENT_EPOCH}`);
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
