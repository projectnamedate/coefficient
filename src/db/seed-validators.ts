import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "./schema";

const client = createClient({ url: "file:./data/coefficient.db" });
const db = drizzle(client, { schema });

const CURRENT_EPOCH = 780;
const now = new Date().toISOString();

// Sample validators (realistic names/data from the Solana ecosystem)
const validatorData = [
  { pubkey: "J2nUHEAgZFRyuJbFjdqPrAa9gyWDuc7hErtDQHPhwNjK", name: "Shinobi Systems", country: "DE", city: "Frankfurt", datacenter: "Hetzner", client: "agave", sfdp: "active" },
  { pubkey: "CertusDeBmqN8ZawdkxK5kFGMwBXdudvWHYwtNgNhvLu", name: "Certus One", country: "US", city: "New York", datacenter: "Equinix NY5", client: "agave", sfdp: "active" },
  { pubkey: "HxkQdUnrPdHwXP5T9kewEXs3ApgaWyEXwTnFcgR8BJ2Q", name: "Everstake", country: "UA", city: "Kyiv", datacenter: "Hetzner", client: "agave", sfdp: "active" },
  { pubkey: "26pV97Ce83ZQ6Kz9XT4tX8Y1SLamYDJrvJd1ZLUYLWNG", name: "Laine", country: "GB", city: "London", datacenter: "OVH", client: "agave", sfdp: "active" },
  { pubkey: "5iJbEkX2rYJrCLEvFBr3JZ9BmFWvuR9pfGh5K2cZPUr2", name: "Triton", country: "US", city: "Ashburn", datacenter: "Equinix DC", client: "agave", sfdp: "active" },
  { pubkey: "Vote111111111111111111111111111111111111112", name: "Phase Labs", country: "SG", city: "Singapore", datacenter: "Equinix SG", client: "agave", sfdp: "active" },
  { pubkey: "DRpbCBMxVnDK7maPMoFqCKdUiGFcrALJQzG9r4QjzRQR", name: "Overclock", country: "US", city: "Chicago", datacenter: "Equinix CH", client: "firedancer", sfdp: "eligible" },
  { pubkey: "3ZnEBa4K1Rg7FUJHqHt7K7kWc2jbRTZMjQGBSQ5n3h2F", name: "Figment", country: "CA", city: "Toronto", datacenter: "AWS", client: "agave", sfdp: "active" },
  { pubkey: "Chorus111111111111111111111111111111111112", name: "Chorus One", country: "CH", city: "Zurich", datacenter: "Equinix ZH", client: "agave", sfdp: "active" },
  { pubkey: "P2P11111111111111111111111111111111111112", name: "P2P Validator", country: "FI", city: "Helsinki", datacenter: "Hetzner", client: "agave", sfdp: "active" },
  { pubkey: "Staked11111111111111111111111111111111112", name: "Staked.us", country: "US", city: "New York", datacenter: "Equinix NY5", client: "agave", sfdp: "active" },
  { pubkey: "SolFlr11111111111111111111111111111111112", name: "Solflare", country: "RS", city: "Belgrade", datacenter: "Hetzner", client: "agave", sfdp: "eligible" },
  { pubkey: "MythX111111111111111111111111111111111112", name: "mythx", country: "US", city: "Dallas", datacenter: "Latitude", client: "agave", sfdp: "active" },
  { pubkey: "DeezN111111111111111111111111111111111112", name: "DeezNode", country: "US", city: "Ashburn", datacenter: "Equinix DC", client: "jito-agave", sfdp: "ineligible" },
  { pubkey: "Guard111111111111111111111111111111111112", name: "Guardian", country: "JP", city: "Tokyo", datacenter: "Equinix TY", client: "agave", sfdp: "active" },
  { pubkey: "Astro111111111111111111111111111111111112", name: "AstroStake", country: "AU", city: "Sydney", datacenter: "Equinix SY", client: "agave", sfdp: "eligible" },
  { pubkey: "Block111111111111111111111111111111111112", name: "Blockdaemon", country: "US", city: "Ashburn", datacenter: "AWS", client: "agave", sfdp: "active" },
  { pubkey: "BisoN111111111111111111111111111111111112", name: "Bison Trails", country: "US", city: "Ashburn", datacenter: "AWS", client: "agave", sfdp: "active" },
  { pubkey: "Mango111111111111111111111111111111111112", name: "Mango Validator", country: "US", city: "Chicago", datacenter: "Equinix CH", client: "jito-agave", sfdp: "ineligible" },
  { pubkey: "Infst111111111111111111111111111111111112", name: "InfStones", country: "CN", city: "Hong Kong", datacenter: "AWS", client: "agave", sfdp: "eligible" },
  { pubkey: "Rockx111111111111111111111111111111111112", name: "RockX", country: "SG", city: "Singapore", datacenter: "AWS", client: "agave", sfdp: "active" },
  { pubkey: "Allnd111111111111111111111111111111111112", name: "Allnodes", country: "DE", city: "Frankfurt", datacenter: "Hetzner", client: "agave", sfdp: "active" },
  { pubkey: "StakC111111111111111111111111111111111112", name: "Stake Capital", country: "FR", city: "Paris", datacenter: "OVH", client: "agave", sfdp: "active" },
  { pubkey: "NodeA111111111111111111111111111111111112", name: "Node.Monster", country: "NL", city: "Amsterdam", datacenter: "Leaseweb", client: "firedancer", sfdp: "eligible" },
  { pubkey: "W3Cld111111111111111111111111111111111112", name: "Web3 Cloud", country: "KR", city: "Seoul", datacenter: "AWS", client: "agave", sfdp: "eligible" },
];

// Generate realistic snapshots
function randomBetween(min: number, max: number) {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

const tiers: Array<"small" | "medium" | "large" | "superminority"> = ["small", "small", "small", "medium", "medium", "large", "superminority"];

// Pool memberships for delegations
const poolAssignments: Record<string, string[]> = {
  "J2nUHEAgZFRyuJbFjdqPrAa9gyWDuc7hErtDQHPhwNjK": ["jito", "blazestake", "phase"],
  "CertusDeBmqN8ZawdkxK5kFGMwBXdudvWHYwtNgNhvLu": ["jito", "doublezero", "marinade"],
  "HxkQdUnrPdHwXP5T9kewEXs3ApgaWyEXwTnFcgR8BJ2Q": ["jito", "doublezero", "jpool"],
  "26pV97Ce83ZQ6Kz9XT4tX8Y1SLamYDJrvJd1ZLUYLWNG": ["blazestake", "phase", "jpool", "jagpool"],
  "5iJbEkX2rYJrCLEvFBr3JZ9BmFWvuR9pfGh5K2cZPUr2": ["jito", "doublezero"],
  "Vote111111111111111111111111111111111111112": ["phase", "blazestake", "indiesol"],
  "DRpbCBMxVnDK7maPMoFqCKdUiGFcrALJQzG9r4QjzRQR": ["jito", "marinade", "stke"],
  "3ZnEBa4K1Rg7FUJHqHt7K7kWc2jbRTZMjQGBSQ5n3h2F": ["jito", "doublezero", "blazestake"],
  "Chorus111111111111111111111111111111111112": ["jito", "doublezero", "jpool"],
  "P2P11111111111111111111111111111111111112": ["blazestake", "phase", "definity"],
  "Staked11111111111111111111111111111111112": ["jito", "doublezero"],
  "SolFlr11111111111111111111111111111111112": ["vault", "edgevana", "shinobi"],
  "MythX111111111111111111111111111111111112": ["phase", "blazestake", "jagpool", "definity"],
  "DeezN111111111111111111111111111111111112": ["marinade", "vault"],
  "Guard111111111111111111111111111111111112": ["jito", "phase", "jpool"],
  "Astro111111111111111111111111111111111112": ["phase", "blazestake", "indiesol"],
  "Block111111111111111111111111111111111112": ["jito", "doublezero", "jpool"],
  "BisoN111111111111111111111111111111111112": ["jito", "doublezero"],
  "Mango111111111111111111111111111111111112": ["vault", "marinade", "stke"],
  "Infst111111111111111111111111111111111112": ["jito", "edgevana"],
  "Rockx111111111111111111111111111111111112": ["jito", "doublezero", "shinobi"],
  "Allnd111111111111111111111111111111111112": ["blazestake", "jpool", "dynosol"],
  "StakC111111111111111111111111111111111112": ["phase", "definity", "jagpool"],
  "NodeA111111111111111111111111111111111112": ["phase", "blazestake", "indiesol"],
  "W3Cld111111111111111111111111111111111112": ["jpool", "doublezero", "stke"],
};

async function seedValidators() {
  console.log("Seeding validators...");

  for (let i = 0; i < validatorData.length; i++) {
    const v = validatorData[i];

    await db.insert(schema.validators).values({
      pubkey: v.pubkey,
      name: v.name,
      country: v.country,
      city: v.city,
      datacenter: v.datacenter,
      client: v.client,
      sfdpStatus: v.sfdp,
      createdAt: now,
    }).onConflictDoNothing();

    const tier = tiers[i % tiers.length];
    const stakeMultiplier = tier === "superminority" ? 5_000_000 : tier === "large" ? 1_500_000 : tier === "medium" ? 400_000 : 80_000;
    const activeStake = stakeMultiplier + randomBetween(-stakeMultiplier * 0.3, stakeMultiplier * 0.3);
    const isSandwich = v.name === "DeezNode" || v.name === "Mango Validator";

    await db.insert(schema.validatorSnapshots).values({
      epochNumber: CURRENT_EPOCH,
      validatorPubkey: v.pubkey,
      activeStake,
      commission: isSandwich ? 0 : Math.floor(randomBetween(3, 10)),
      voteCredits: Math.floor(randomBetween(380000, 432000)),
      skipRate: randomBetween(0.1, 5.0),
      apy: randomBetween(5.2, 7.0),
      wizScore: isSandwich ? Math.floor(randomBetween(10, 30)) : Math.floor(randomBetween(55, 95)),
      stakeTier: tier,
      isSuperminority: tier === "superminority",
    }).onConflictDoNothing();

    // Add sandwich entries
    if (isSandwich) {
      await db.insert(schema.sandwichList).values({
        validatorPubkey: v.pubkey,
        detectedDate: "2025-05-01",
        source: "sandwiched.me",
        sandwichPercent: v.name === "DeezNode" ? 42.5 : 18.3,
        lastUpdated: now,
      }).onConflictDoNothing();
    }

    // Add pool delegations
    const pools = poolAssignments[v.pubkey] ?? [];
    for (const poolId of pools) {
      const delegatedSol = randomBetween(5000, 200000);
      await db.insert(schema.poolDelegations).values({
        epochNumber: CURRENT_EPOCH,
        poolId,
        validatorPubkey: v.pubkey,
        delegatedSol,
      }).onConflictDoNothing();
    }
  }

  console.log(`Seeded ${validatorData.length} validators with snapshots and delegations`);
  process.exit(0);
}

seedValidators().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
