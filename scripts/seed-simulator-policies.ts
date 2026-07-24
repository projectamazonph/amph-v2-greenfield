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
  dimensionConfig: Record<string, { weight: number; passingThreshold: number }>;
  passingScore: number;
};

const POLICIES: PolicyDef[] = [
  // ── Bid Elevator ──────────────────────────────────────────────────────
  // Dimensions: bidAccuracy (40%), budgetAdherence (30%), roasHit (20%), explanation (10%)
  {
    id: "policy-bid-elevator-beginner-practice",
    simulatorId: "bid-elevator",
    difficulty: "beginner",
    mode: "practice",
    dimensionConfig: {
      bidAccuracy: { weight: 0.4, passingThreshold: 50 },
      budgetAdherence: { weight: 0.3, passingThreshold: 50 },
      roasHit: { weight: 0.2, passingThreshold: 50 },
    },
    passingScore: 50,
  },
  {
    id: "policy-bid-elevator-beginner-credential",
    simulatorId: "bid-elevator",
    difficulty: "beginner",
    mode: "credential",
    dimensionConfig: {
      bidAccuracy: { weight: 0.4, passingThreshold: 65 },
      budgetAdherence: { weight: 0.3, passingThreshold: 65 },
      roasHit: { weight: 0.2, passingThreshold: 65 },
      explanation: { weight: 0.1, passingThreshold: 60 },
    },
    passingScore: 65,
  },
  {
    id: "policy-bid-elevator-intermediate-practice",
    simulatorId: "bid-elevator",
    difficulty: "intermediate",
    mode: "practice",
    dimensionConfig: {
      bidAccuracy: { weight: 0.4, passingThreshold: 65 },
      budgetAdherence: { weight: 0.3, passingThreshold: 65 },
      roasHit: { weight: 0.2, passingThreshold: 65 },
    },
    passingScore: 65,
  },
  {
    id: "policy-bid-elevator-advanced-practice",
    simulatorId: "bid-elevator",
    difficulty: "advanced",
    mode: "practice",
    dimensionConfig: {
      bidAccuracy: { weight: 0.4, passingThreshold: 80 },
      budgetAdherence: { weight: 0.3, passingThreshold: 80 },
      roasHit: { weight: 0.2, passingThreshold: 80 },
      explanation: { weight: 0.1, passingThreshold: 70 },
    },
    passingScore: 80,
  },

  // ── STR Triage ───────────────────────────────────────────────────────
  {
    id: "policy-str-triage-beginner-practice",
    simulatorId: "str-triage",
    difficulty: "beginner",
    mode: "practice",
    dimensionConfig: {
      direction: { weight: 0.4, passingThreshold: 70 },
      profitability: { weight: 0.4, passingThreshold: 70 },
      dataSufficiency: { weight: 0.2, passingThreshold: 70 },
    },
    passingScore: 70,
  },
  {
    id: "policy-str-triage-beginner-credential",
    simulatorId: "str-triage",
    difficulty: "beginner",
    mode: "credential",
    dimensionConfig: {
      direction: { weight: 0.3, passingThreshold: 75 },
      profitability: { weight: 0.4, passingThreshold: 75 },
      dataSufficiency: { weight: 0.2, passingThreshold: 75 },
      explanation: { weight: 0.1, passingThreshold: 70 },
    },
    passingScore: 75,
  },
  {
    id: "policy-str-triage-intermediate-practice",
    simulatorId: "str-triage",
    difficulty: "intermediate",
    mode: "practice",
    dimensionConfig: {
      direction: { weight: 0.3, passingThreshold: 72 },
      profitability: { weight: 0.5, passingThreshold: 72 },
      dataSufficiency: { weight: 0.2, passingThreshold: 72 },
    },
    passingScore: 72,
  },
  {
    id: "policy-str-triage-advanced-practice",
    simulatorId: "str-triage",
    difficulty: "advanced",
    mode: "practice",
    dimensionConfig: {
      direction: { weight: 0.3, passingThreshold: 75 },
      profitability: { weight: 0.5, passingThreshold: 75 },
      dataSufficiency: { weight: 0.1, passingThreshold: 72 },
      explanation: { weight: 0.1, passingThreshold: 70 },
    },
    passingScore: 75,
  },

  // ── Campaign Builder ──────────────────────────────────────────────────
  {
    id: "policy-campaign-builder-beginner-practice",
    simulatorId: "campaign-builder",
    difficulty: "beginner",
    mode: "practice",
    dimensionConfig: {
      direction: { weight: 0.35, passingThreshold: 70 },
      profitability: { weight: 0.35, passingThreshold: 70 },
      dataSufficiency: { weight: 0.3, passingThreshold: 70 },
    },
    passingScore: 70,
  },
  {
    id: "policy-campaign-builder-intermediate-practice",
    simulatorId: "campaign-builder",
    difficulty: "intermediate",
    mode: "practice",
    dimensionConfig: {
      direction: { weight: 0.3, passingThreshold: 72 },
      profitability: { weight: 0.4, passingThreshold: 72 },
      dataSufficiency: { weight: 0.2, passingThreshold: 72 },
      explanation: { weight: 0.1, passingThreshold: 70 },
    },
    passingScore: 72,
  },
  {
    id: "policy-campaign-builder-advanced-practice",
    simulatorId: "campaign-builder",
    difficulty: "advanced",
    mode: "practice",
    dimensionConfig: {
      direction: { weight: 0.25, passingThreshold: 75 },
      profitability: { weight: 0.35, passingThreshold: 75 },
      dataSufficiency: { weight: 0.2, passingThreshold: 72 },
      explanation: { weight: 0.2, passingThreshold: 72 },
    },
    passingScore: 75,
  },

  // ── Listing Audit ─────────────────────────────────────────────────────
  {
    id: "policy-listing-audit-beginner-practice",
    simulatorId: "listing-audit",
    difficulty: "beginner",
    mode: "practice",
    dimensionConfig: {
      direction: { weight: 0.4, passingThreshold: 70 },
      dataSufficiency: { weight: 0.4, passingThreshold: 70 },
      explanation: { weight: 0.2, passingThreshold: 70 },
    },
    passingScore: 70,
  },
  {
    id: "policy-listing-audit-intermediate-practice",
    simulatorId: "listing-audit",
    difficulty: "intermediate",
    mode: "practice",
    dimensionConfig: {
      direction: { weight: 0.35, passingThreshold: 72 },
      dataSufficiency: { weight: 0.35, passingThreshold: 72 },
      profitability: { weight: 0.15, passingThreshold: 70 },
      explanation: { weight: 0.15, passingThreshold: 70 },
    },
    passingScore: 72,
  },
  {
    id: "policy-listing-audit-advanced-practice",
    simulatorId: "listing-audit",
    difficulty: "advanced",
    mode: "practice",
    dimensionConfig: {
      direction: { weight: 0.3, passingThreshold: 75 },
      dataSufficiency: { weight: 0.25, passingThreshold: 75 },
      profitability: { weight: 0.2, passingThreshold: 72 },
      explanation: { weight: 0.25, passingThreshold: 72 },
    },
    passingScore: 75,
  },
];

// ── Main ─────────────────────────────────────────────────────────────────

async function main() {
  console.log(`Seeding ${POLICIES.length} ScorePolicy records...\n`);

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
          dimensionConfig: policy.dimensionConfig,
          passingScore: policy.passingScore,
        },
        create: {
          id: policy.id,
          simulatorId: policy.simulatorId,
          difficulty: policy.difficulty,
          mode: policy.mode,
          dimensionConfig: policy.dimensionConfig,
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
