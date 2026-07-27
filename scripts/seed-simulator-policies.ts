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

import { POLICIES } from "./simulator-policies";

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
