/**
 * scripts/seed-orchestrator.ts
 *
 * Unified orchestrator for all database seeding operations.
 * Runs seeds in dependency order and provides status tracking.
 *
 * Usage:
 *   pnpm db:seed              # Run all seeds in order
 *   pnpm db:seed --force      # Re-run all seeds (skip checks)
 *   pnpm db:seed --dry-run    # Show what would be done
 *   pnpm db:seed --only tiers # Run only specific seeds (comma-separated)
 *
 * Requires DATABASE_URL in .env.local or .env.
 * Run after `pnpm prisma migrate deploy`.
 */

import { existsSync, readFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { execSync } from "node:child_process";

// [32m[33m[31m[36m[34m[0m
const colors = {
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
  blue: "\x1b[34m",
  reset: "\x1b[0m",
};

// [32m[33m[31m[36m[0m
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
  console.error(
    `${colors.red}Error:${colors.reset} DATABASE_URL is not set. Check .env.local or .env.`,
  );
  process.exit(1);
}

// Seed definitions with dependencies
interface SeedDefinition {
  name: string;
  script: string;
  description: string;
  dependencies: string[];
  required: boolean;
}

const SEEDS: Record<string, SeedDefinition> = {
  tiers: {
    name: "Pricing Tiers",
    script: "pnpm db:seed:tiers",
    description: "Seed pricing tier definitions",
    dependencies: [],
    required: true,
  },
  admin: {
    name: "Admin User",
    script: "pnpm db:seed:admin",
    description: "Create admin user for local development",
    dependencies: [],
    required: false, // Optional - may not want in all environments
  },
  policies: {
    name: "Score Policies",
    script: "pnpm db:seed:policies",
    description: "Seed simulator scoring policies",
    dependencies: [],
    required: true,
  },
  scenarios: {
    name: "Simulator Scenarios",
    script: "pnpm db:seed:scenarios",
    description: "Seed simulator scenario data",
    dependencies: [],
    required: true,
  },
  resources: {
    name: "Download Center Resources",
    script: "pnpm db:seed:resources",
    description: "Seed downloadable resources",
    dependencies: [],
    required: true,
  },
  curriculum: {
    name: "Curriculum Content",
    script: "pnpm db:seed:curriculum",
    description: "Seed courses, modules, lessons from MDX",
    dependencies: ["tiers"], // Courses reference pricing tiers
    required: true,
  },
  allContent: {
    name: "All Content (MDX)",
    script: "pnpm tsx scripts/seed-all-content.mjs",
    description: "Comprehensive seed of all curriculum content",
    dependencies: ["tiers"],
    required: false, // Alternative to curriculum seed
  },
};

// Dependency order (topological sort)
const DEPENDENCY_ORDER = [
  "tiers",
  "admin",
  "policies",
  "scenarios",
  "resources",
  "curriculum",
  "allContent",
];

// Check if a seed has already been run by querying the database
async function isSeedNeeded(seedName: string): Promise<boolean> {
  // For now, we'll always run unless --force is used
  // In the future, we could query specific tables to check if data exists
  return true;
}

function runCommand(
  command: string,
  dryRun: boolean = false,
): { success: boolean; output: string } {
  if (dryRun) {
    return { success: true, output: `[DRY RUN] ${command}` };
  }

  try {
    const output = execSync(command, {
      stdio: "pipe",
      encoding: "utf-8",
      env: process.env,
    });
    return { success: true, output };
  } catch (error: any) {
    return {
      success: false,
      output: error.stdout || error.stderr || error.message || "Unknown error",
    };
  }
}

function getSeedOrder(only?: string[]): string[] {
  if (!only || only.length === 0) {
    return DEPENDENCY_ORDER;
  }

  // If specific seeds requested, run them with their dependencies
  const requested = new Set(only.map((s) => s.toLowerCase()));
  const order: string[] = [];

  for (const seedName of DEPENDENCY_ORDER) {
    if (requested.has(seedName)) {
      // Add dependencies first
      for (const dep of SEEDS[seedName].dependencies) {
        if (!order.includes(dep)) {
          order.push(dep);
        }
      }
      order.push(seedName);
    }
  }

  return order;
}

function printStatus(message: string, type: "info" | "success" | "warning" | "error" = "info") {
  const iconMap = {
    info: `${colors.blue}ℹ${colors.reset}`,
    success: `${colors.green}✓${colors.reset}`,
    warning: `${colors.yellow}⚠${colors.reset}`,
    error: `${colors.red}✗${colors.reset}`,
  };
  const icon = iconMap[type] || iconMap.info;
  console.log(`  ${icon} ${message}`);
}

function printHeader(message: string) {
  console.log(`\n${colors.cyan}${message}${colors.reset}`);
  console.log(`${colors.cyan}${"─".repeat(message.length)}${colors.reset}`);
}

function printSummary(results: Map<string, { success: boolean; output: string }>) {
  const successCount = Array.from(results.values()).filter((r) => r.success).length;
  const totalCount = results.size;

  printHeader("Seed Summary");

  for (const [name, result] of results) {
    const seed = SEEDS[name];
    const status = result.success
      ? `${colors.green}✓ SUCCESS${colors.reset}`
      : `${colors.red}✗ FAILED${colors.reset}`;
    console.log(`  ${status} ${seed.name}`);

    if (!result.success) {
      console.log(`    ${colors.red}${result.output.split("\n").join("\n    ")}${colors.reset}`);
    }
  }

  console.log(
    `\n${colors.cyan}Results: ${successCount}/${totalCount} seeds completed successfully${colors.reset}\n`,
  );
}

async function main() {
  const { values, positionals } = parseArgs({
    options: {
      force: { type: "boolean", default: false, short: "f" },
      "dry-run": { type: "boolean", default: false, short: "d" },
      only: { type: "string", short: "o" },
      skip: { type: "string", short: "s" },
      verbose: { type: "boolean", default: false, short: "v" },
    },
    allowPositionals: true,
  });

  const force = values.force === true;
  const dryRun = values["dry-run"] === true;
  const only = values.only?.split(",").map((s) => s.trim().toLowerCase());
  const skip = values.skip?.split(",").map((s) => s.trim().toLowerCase());
  const verbose = values.verbose === true;

  printHeader("AMPH Database Seed Orchestrator");
  console.log(`  Mode: ${dryRun ? "DRY RUN" : force ? "FORCE" : "NORMAL"}`);
  console.log(`  Scope: ${only ? `only: ${only.join(", ")}` : "all seeds"}`);
  console.log(`  Skip: ${skip ? skip.join(", ") : "none"}\n`);

  if (dryRun) {
    printStatus("Dry run mode - no changes will be made", "info");
  }

  const seedOrder = getSeedOrder(only);
  const results = new Map<string, { success: boolean; output: string }>();
  let hasErrors = false;

  for (const seedName of seedOrder) {
    const seed = SEEDS[seedName];

    // Skip if explicitly requested to skip
    if (skip && skip.includes(seedName)) {
      printStatus(`Skipping ${seed.name} (requested to skip)`, "warning");
      continue;
    }

    // Check if seed is required or explicitly requested
    if (!seed.required && !only?.includes(seedName)) {
      if (verbose) {
        printStatus(`Skipping ${seed.name} (not required, not requested)`, "info");
      }
      continue;
    }

    printStatus(`Running ${seed.name}...`, "info");

    if (verbose) {
      console.log(`    Script: ${seed.script}`);
      console.log(
        `    Dependencies: ${seed.dependencies.length > 0 ? seed.dependencies.join(", ") : "none"}`,
      );
    }

    const result = runCommand(seed.script, dryRun);
    results.set(seedName, result);

    if (result.success) {
      printStatus(`${seed.name} completed successfully`, "success");
    } else {
      printStatus(`${seed.name} failed`, "error");
      if (verbose) {
        console.log(`    Error: ${result.output}`);
      }
      hasErrors = true;

      // Stop on error unless --force is used
      if (!force) {
        printStatus("Stopping due to error (use --force to continue)", "error");
        break;
      }
    }

    console.log();
  }

  printSummary(results);

  if (hasErrors) {
    printStatus("Some seeds failed. Check the output above.", "error");
    process.exit(1);
  }

  printStatus("All seeds completed successfully!", "success");
}

main().catch((error) => {
  console.error(`${colors.red}Orchestrator failed:${colors.reset}`, error);
  process.exit(1);
});
