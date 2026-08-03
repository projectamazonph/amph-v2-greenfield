/**
 * scripts/seed-simulator-scenarios.ts
 *
 * Seeds the SimulatorScenario rows that every simulator's full attempt-
 * lifecycle action (StartSimulatorAttempt) requires to exist before it will
 * grade a submission. No seed script ever created these rows, so on a
 * fresh database str-triage's "Grade my triage" (which has no legacy
 * ungated fallback, unlike the other four simulators) fails outright with
 * a scenario_not_found error surfaced straight to the student. The other
 * four simulators' *Attempt() actions reference the same missing IDs and
 * would fail identically once wired to their pages. Idempotent: re-running
 * safely upserts existing scenarios.
 *
 * Usage:
 *   pnpm db:seed:scenarios
 *
 * Requires DATABASE_URL in .env.local or .env. Run after
 * `pnpm prisma migrate deploy`.
 */

import { existsSync, readFileSync } from "node:fs";
import { prisma } from "@/infra/database/prisma";
import { createSimulatorScenario } from "@/domain/entities/SimulatorScenario";
import type { SimulatorScenario } from "@/domain/entities/SimulatorScenario";

// ── .env loader ──────────────────────────────────────────────────────────

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

// ── Scenarios ────────────────────────────────────────────────────────────
// IDs must match the DEFAULT_SCENARIO_ID / hardcoded scenarioId in each
// simulator's src/app/tools/<name>/actions.ts.

const SCENARIOS: ReadonlyArray<{
  id: string;
  simulatorId: string;
  name: string;
  description: string;
  difficulty: string;
  estimatedMinutes: number;
}> = [
  {
    id: "bid-elevator-scenario-default",
    simulatorId: "bid-elevator",
    name: "Reduce ACoS on a high-spend electronics campaign",
    description: "Wireless earbuds campaign spending ₱800/day at 45% ACoS; target is 25%.",
    difficulty: "intermediate",
    estimatedMinutes: 10,
  },
  {
    id: "str-triage-scenario-kitchen-products",
    simulatorId: "str-triage",
    name: "Clean up a broad match campaign for kitchen products",
    description: "Triage 14 search terms from a broad-match kitchen products campaign.",
    difficulty: "intermediate",
    estimatedMinutes: 15,
  },
  {
    id: "campaign-builder-scenario-default",
    simulatorId: "campaign-builder",
    name: "Launch a Sponsored Products campaign for wireless earbuds",
    description: "Build a complete SP campaign with manual targeting and a ₱500/day budget.",
    difficulty: "beginner",
    estimatedMinutes: 15,
  },
  {
    id: "listing-audit-scenario-bamboo-cutting-board",
    simulatorId: "listing-audit",
    name: "Bamboo Cutting Board — Premium Kitchen Essential",
    description: "Audit and revise a bamboo cutting board listing.",
    difficulty: "beginner",
    estimatedMinutes: 10,
  },
  {
    id: "keyword-research-scenario-default",
    simulatorId: "keyword-research",
    name: "Keyword research for bamboo cutting board niche",
    description: "Classify intent and flag negatives across 18 keywords in the niche.",
    difficulty: "beginner",
    estimatedMinutes: 10,
  },
];

// ── Main ─────────────────────────────────────────────────────────────────

async function main() {
  console.log(`Seeding ${SCENARIOS.length} SimulatorScenario records...\n`);

  const validated: SimulatorScenario[] = [];
  const invalid: string[] = [];

  for (const scenario of SCENARIOS) {
    const result = createSimulatorScenario({
      id: scenario.id,
      simulatorId: scenario.simulatorId,
      name: scenario.name,
      description: scenario.description,
      inputSchema: {},
      outputSchema: {},
      difficulty: scenario.difficulty,
      estimatedMinutes: scenario.estimatedMinutes,
    });

    if (!result.ok) {
      invalid.push(`  ${scenario.id}: ${JSON.stringify(result.error)}`);
    } else {
      validated.push(result.value);
    }
  }

  if (invalid.length > 0) {
    console.error(`\nRefusing to seed. ${invalid.length} scenario(s) are invalid:\n`);
    console.error(invalid.join("\n"));
    await prisma.$disconnect();
    process.exit(1);
  }

  console.log(`All ${validated.length} scenarios passed createSimulatorScenario() validation.\n`);

  let created = 0;
  let upserted = 0;

  for (const scenario of validated) {
    try {
      const result = await prisma.simulatorScenario.upsert({
        where: { id: scenario.id },
        update: {
          name: scenario.name,
          description: scenario.description,
          inputSchema: scenario.inputSchema,
          outputSchema: scenario.outputSchema,
          difficulty: scenario.difficulty,
          estimatedMinutes: scenario.estimatedMinutes,
        },
        create: {
          id: scenario.id,
          simulatorId: scenario.simulatorId,
          name: scenario.name,
          description: scenario.description,
          inputSchema: scenario.inputSchema,
          outputSchema: scenario.outputSchema,
          difficulty: scenario.difficulty,
          estimatedMinutes: scenario.estimatedMinutes,
        },
      });

      const action =
        result.createdAt.getTime() === result.updatedAt.getTime() ? "created" : "upserted";
      if (action === "created") created++;
      else upserted++;

      console.log(`  ${action.padEnd(8)} ${scenario.simulatorId}/${scenario.id}`);
    } catch (err) {
      console.error(`  ERROR   ${scenario.simulatorId}/${scenario.id}:`, err);
    }
  }

  console.log(
    `\nDone: ${created} created, ${upserted} upserted, ${validated.length - created - upserted} failed.`,
  );
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
