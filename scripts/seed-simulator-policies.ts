/**
 * scripts/seed-simulator-policies.ts
 *
 * Seeds ScorePolicy records for all simulators (bid-elevator, str-triage,
 * campaign-builder, listing-audit) across difficulty/mode combinations.
 * Idempotent: re-running safely upserts existing policies.
 *
 * Usage:
 *   pnpm db:seed:policies
 *
 * Requires DATABASE_URL in .env.local. Run after `pnpm prisma migrate deploy`.
 *
 * STORY-067.
 */

import { existsSync, readFileSync } from "node:fs";
import { prisma } from "@/infra/database/prisma";
import { createScorePolicy, type ScorePolicy } from "@/domain/entities/ScorePolicy";
import type { SimulatorId } from "@/domain/entities/SimulatorScenario";
import type { Difficulty, SimulatorMode } from "@/domain/entities/SimulatorAttempt";

// ── .env loader ──────────────────────────────────────────────────────────────

function loadEnvFile(path: string): void {
  if (!existsSync(path)) return;
  const text = readFileSync(path, "utf-8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

if (!process.env.DATABASE_URL) {
  console.error("Error: DATABASE_URL is not set. Check .env.local or .env.");
  process.exit(1);
}

// ── Policy definitions ────────────────────────────────────────────────────

type PolicyDef = {
  id: string;
  simulatorId: string;
  difficulty: string;
  mode: string;
  /** Dimension name -> weight. Must sum to 1.0; validated below. */
  dimensionConfig: Record<string, number>;
  passingScore: number;
};

const POLICIES: PolicyDef[] = [
  // Weights are the pre-Sprint-14 relative weights, renormalised after
  // removing `explanation` (a hardcoded 100, pure free marks) and
  // `dataSufficiency`/`reviewCoverage` (completion, not judgement).
  // Every policy sums to exactly 1.0 and is validated through
  // createScorePolicy() below. STORY-071, STORY-072, STORY-074.

  // ── Bid Elevator ──────────────────────────────────────────────────────
  {
    id: "policy-bid-elevator-beginner-practice",
    simulatorId: "bid-elevator",
    difficulty: "beginner",
    mode: "practice",
    dimensionConfig: { bidAccuracy: 0.45, budgetAdherence: 0.33, roasHit: 0.22 },
    passingScore: 50,
  },
  {
    id: "policy-bid-elevator-beginner-credential",
    simulatorId: "bid-elevator",
    difficulty: "beginner",
    mode: "credential",
    dimensionConfig: { bidAccuracy: 0.45, budgetAdherence: 0.33, roasHit: 0.22 },
    passingScore: 65,
  },
  {
    id: "policy-bid-elevator-intermediate-practice",
    simulatorId: "bid-elevator",
    difficulty: "intermediate",
    mode: "practice",
    dimensionConfig: { bidAccuracy: 0.45, budgetAdherence: 0.33, roasHit: 0.22 },
    passingScore: 65,
  },
  {
    id: "policy-bid-elevator-advanced-practice",
    simulatorId: "bid-elevator",
    difficulty: "advanced",
    mode: "practice",
    dimensionConfig: { bidAccuracy: 0.45, budgetAdherence: 0.33, roasHit: 0.22 },
    passingScore: 80,
  },

  // ── STR Triage ───────────────────────────────────────────────────────
  // `profitability` here is genuinely revenue-based (preserved revenue over
  // non-pausable revenue), so unlike Listing Audit's it keeps its name.
  {
    id: "policy-str-triage-beginner-practice",
    simulatorId: "str-triage",
    difficulty: "beginner",
    mode: "practice",
    dimensionConfig: { direction: 0.5, profitability: 0.5 },
    passingScore: 70,
  },
  {
    id: "policy-str-triage-beginner-credential",
    simulatorId: "str-triage",
    difficulty: "beginner",
    mode: "credential",
    dimensionConfig: { direction: 0.43, profitability: 0.57 },
    passingScore: 75,
  },
  {
    id: "policy-str-triage-intermediate-practice",
    simulatorId: "str-triage",
    difficulty: "intermediate",
    mode: "practice",
    dimensionConfig: { direction: 0.37, profitability: 0.63 },
    passingScore: 72,
  },
  {
    id: "policy-str-triage-advanced-practice",
    simulatorId: "str-triage",
    difficulty: "advanced",
    mode: "practice",
    dimensionConfig: { direction: 0.37, profitability: 0.63 },
    passingScore: 75,
  },

  // ── Campaign Builder ──────────────────────────────────────────────────
  {
    id: "policy-campaign-builder-beginner-practice",
    simulatorId: "campaign-builder",
    difficulty: "beginner",
    mode: "practice",
    dimensionConfig: { structureQuality: 0.45, budgetAllocation: 0.33, keywordRelevance: 0.22 },
    passingScore: 50,
  },
  {
    id: "policy-campaign-builder-intermediate-practice",
    simulatorId: "campaign-builder",
    difficulty: "intermediate",
    mode: "practice",
    dimensionConfig: { structureQuality: 0.45, budgetAllocation: 0.33, keywordRelevance: 0.22 },
    passingScore: 65,
  },
  {
    id: "policy-campaign-builder-advanced-practice",
    simulatorId: "campaign-builder",
    difficulty: "advanced",
    mode: "practice",
    dimensionConfig: { structureQuality: 0.45, budgetAllocation: 0.33, keywordRelevance: 0.22 },
    passingScore: 80,
  },

  // ── Listing Audit ─────────────────────────────────────────────────────
  // `priorityCoverage` was `profitability`, renamed because nothing here
  // models revenue. STORY-073, STORY-076.
  {
    id: "policy-listing-audit-beginner-practice",
    simulatorId: "listing-audit",
    difficulty: "beginner",
    mode: "practice",
    dimensionConfig: { direction: 1.0 },
    passingScore: 70,
  },
  {
    id: "policy-listing-audit-intermediate-practice",
    simulatorId: "listing-audit",
    difficulty: "intermediate",
    mode: "practice",
    dimensionConfig: { direction: 0.7, priorityCoverage: 0.3 },
    passingScore: 72,
  },
  {
    id: "policy-listing-audit-advanced-practice",
    simulatorId: "listing-audit",
    difficulty: "advanced",
    mode: "practice",
    dimensionConfig: { direction: 0.6, priorityCoverage: 0.4 },
    passingScore: 75,
  },
];

/**
 * The DB stores `Record<string, { weight }>` to match DimensionConfig. The
 * table above uses bare numbers because a weight is all a policy carries now
 * that passingThreshold is gone (STORY-075).
 */
function toPersistedConfig(cfg: Record<string, number>): Record<string, { weight: number }> {
  return Object.fromEntries(Object.entries(cfg).map(([dim, weight]) => [dim, { weight }]));
}

// ── Main ─────────────────────────────────────────────────────────────────

async function main() {
  console.log(`Seeding ${POLICIES.length} ScorePolicy records...\n`);

  // Validate EVERY policy through the domain factory before writing any of
  // them. This script used to call prisma.upsert directly, which bypassed
  // createScorePolicy() entirely: four policies shipped with weights summing
  // to 0.90 (capping a flawless learner at 90) and seven used dimension names
  // that were not in KNOWN_DIMENSIONS. Neither was ever caught because the
  // read path hydrates via hydrateScorePolicy(), which skips validation too.
  // Validate first, fail loudly, write nothing on error. STORY-074.
  const validated: ScorePolicy[] = [];
  const invalid: string[] = [];

  for (const policy of POLICIES) {
    const result = createScorePolicy({
      id: policy.id,
      simulatorId: policy.simulatorId as SimulatorId,
      difficulty: policy.difficulty as Difficulty,
      mode: policy.mode as SimulatorMode,
      dimensionConfig: Object.fromEntries(
        Object.entries(policy.dimensionConfig).map(([dim, weight]) => [dim, { weight }]),
      ),
      passingScore: policy.passingScore,
    });

    if (!result.ok) {
      invalid.push(`  ${policy.id}: ${JSON.stringify(result.error)}`);
    } else {
      validated.push(result.value);
    }
  }

  if (invalid.length > 0) {
    console.error(`\nRefusing to seed. ${invalid.length} policy/policies are invalid:\n`);
    console.error(invalid.join("\n"));
    await prisma.$disconnect();
    process.exit(1);
  }

  console.log(`All ${validated.length} policies passed createScorePolicy() validation.\n`);

  let created = 0;
  let upserted = 0;

  for (const policy of POLICIES) {
    try {
      const result = await prisma.scorePolicy.upsert({
        where: {
          simulatorId_difficulty_mode: {
            simulatorId: policy.simulatorId,
            difficulty: policy.difficulty,
            mode: policy.mode,
          },
        },
        update: {
          dimensionConfig: toPersistedConfig(policy.dimensionConfig),
          passingScore: policy.passingScore,
        },
        create: {
          id: policy.id,
          simulatorId: policy.simulatorId,
          difficulty: policy.difficulty,
          mode: policy.mode,
          dimensionConfig: toPersistedConfig(policy.dimensionConfig),
          passingScore: policy.passingScore,
        },
      });

      const action =
        result.createdAt.getTime() === result.updatedAt.getTime() ? "created" : "upserted";
      if (action === "created") created++;
      else upserted++;

      console.log(
        `  ${action.padEnd(8)} ${policy.simulatorId}/${policy.difficulty}/${policy.mode}`,
      );
    } catch (err) {
      console.error(`  ERROR   ${policy.simulatorId}/${policy.difficulty}/${policy.mode}:`, err);
    }
  }

  console.log(
    `\nDone: ${created} created, ${upserted} upserted, ${POLICIES.length - created - upserted} failed.`,
  );
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
