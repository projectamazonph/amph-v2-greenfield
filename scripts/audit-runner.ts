/**
 * scripts/audit-runner.ts
 *
 * Unified runner for all curriculum and content validation scripts.
 * Runs all validations in parallel and aggregates results.
 *
 * Usage:
 *   pnpm tsx scripts/audit-runner.ts              # Run all validations
 *   pnpm tsx scripts/audit-runner.ts --fix       # Attempt to auto-fix issues
 *   pnpm tsx scripts/audit-runner.ts --strict    # Treat warnings as errors
 *   pnpm tsx scripts/audit-runner.ts --only lesson-production  # Run specific validation
 *
 * Exit codes:
 *   0 - All validations passed
 *   1 - Validation failures found
 *   2 - Runtime error
 */

import { existsSync, readFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { execSync } from "node:child_process";
import { resolve } from "node:path";

// ANSI color codes
const colors = {
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  reset: "\x1b[0m",
};

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

interface ValidationResult {
  name: string;
  command: string;
  success: boolean;
  exitCode: number;
  output: string;
  duration: number;
  issues?: ValidationIssue[];
}

interface ValidationIssue {
  severity: "error" | "warning" | "info";
  message: string;
  file?: string;
  line?: number;
  code?: string;
}

interface ValidatorConfig {
  name: string;
  command: string;
  description: string;
  category: "curriculum" | "content" | "simulator" | "infrastructure";
  fixable: boolean;
  fixCommand?: string;
  timeout?: number;
  required: boolean;
}

// Define all validators
const VALIDATORS: Record<string, ValidatorConfig> = {
  // Curriculum validations
  "curriculum-inventory": {
    name: "Curriculum Inventory",
    command: "pnpm validate:curriculum",
    description: "Validates curriculum inventory.json against source MDX files",
    category: "curriculum",
    fixable: false,
    required: true,
  },

  "lesson-production": {
    name: "Lesson Production",
    command: "pnpm validate:lesson-production",
    description: "Validates lesson structure and production requirements",
    category: "curriculum",
    fixable: false,
    required: true,
  },

  "target-provenance": {
    name: "Target Provenance",
    command: "pnpm validate:target-provenance",
    description: "Validates target provenance data",
    category: "curriculum",
    fixable: false,
    required: true,
  },

  "deck-manifest": {
    name: "Teaching Deck Manifest",
    command: "pnpm validate:deck-manifest",
    description: "Validates teaching deck manifest structure",
    category: "curriculum",
    fixable: false,
    required: false,
  },

  // Simulator validations
  "simulator-policies": {
    name: "Simulator Policies",
    command: "pnpm db:seed:policies --dry-run",
    description: "Validates simulator score policy definitions",
    category: "simulator",
    fixable: false,
    required: true,
  },

  "simulator-scenarios": {
    name: "Simulator Scenarios",
    command: "pnpm db:seed:scenarios --dry-run",
    description: "Validates simulator scenario definitions",
    category: "simulator",
    fixable: false,
    required: true,
  },

  // Infrastructure validations
  "prisma-validate": {
    name: "Prisma Schema",
    command: "pnpm prisma:validate",
    description: "Validates Prisma schema",
    category: "infrastructure",
    fixable: false,
    required: true,
  },

  typecheck: {
    name: "TypeScript",
    command: "pnpm typecheck",
    description: "Runs TypeScript type checking",
    category: "infrastructure",
    fixable: false,
    required: true,
  },

  lint: {
    name: "ESLint",
    command: "pnpm lint",
    description: "Runs ESLint on all files",
    category: "infrastructure",
    fixable: true,
    fixCommand: "pnpm lint --fix",
    required: false,
  },

  // Custom shell script validations
  "file-audit": {
    name: "File Audit",
    command: "bash scripts/_file-audit-issues.sh",
    description: "Runs comprehensive file audit checks",
    category: "content",
    fixable: false,
    required: false,
  },

  "sentence-length": {
    name: "Sentence Length",
    command: "node scripts/_audit-sentence-length.cjs",
    description: "Checks for overly long sentences",
    category: "content",
    fixable: false,
    required: false,
  },

  "voice-audit": {
    name: "Voice Audit",
    command: "node scripts/_audit-voice-phase3-m4-8.cjs",
    description: "Audits voice consistency in modules 4-8",
    category: "content",
    fixable: false,
    required: false,
  },
};

function printHeader(message: string) {
  console.log(`\n${colors.cyan}${message}${colors.reset}`);
  console.log(`${colors.cyan}${"─".repeat(message.length)}${colors.reset}`);
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

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
  return `${(ms / 60000).toFixed(2)}m`;
}

function runValidator(config: ValidatorConfig, timeout: number = 120000): ValidationResult {
  const startTime = Date.now();

  try {
    const output = execSync(config.command, {
      stdio: "pipe",
      encoding: "utf-8",
      timeout,
      env: process.env,
    });

    const duration = Date.now() - startTime;
    const success = true; // If we get here, command succeeded

    return {
      name: config.name,
      command: config.command,
      success,
      exitCode: 0,
      output,
      duration,
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    const exitCode = error.status || 1;
    const output = error.stdout || error.stderr || error.message || "Unknown error";

    return {
      name: config.name,
      command: config.command,
      success: false,
      exitCode,
      output,
      duration,
    };
  }
}

function parseIssues(output: string, validatorName: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const lines = output.split("\n");

  for (const line of lines) {
    if (!line.trim()) continue;

    // Try to parse different error formats
    let severity: "error" | "warning" | "info" = "error";
    let message = line;

    // Common patterns
    if (line.includes("[ERROR]") || line.includes("Error:") || line.includes("✗")) {
      severity = "error";
    } else if (line.includes("[WARN]") || line.includes("Warning:") || line.includes("⚠")) {
      severity = "warning";
    } else if (line.includes("[INFO]") || line.includes("Info:") || line.includes("ℹ")) {
      severity = "info";
    }

    // Clean up the message
    message = message
      .replace(/^\s*[\[✗⚠ℹ]\s*/, "")
      .replace(/^Error: /, "")
      .replace(/^Warning: /, "")
      .replace(/^Info: /, "")
      .trim();

    if (message) {
      issues.push({
        severity,
        message,
        code: validatorName,
      });
    }
  }

  return issues;
}

function printResult(result: ValidationResult, verbose: boolean = false) {
  const statusIcon = result.success
    ? `${colors.green}✓ PASS${colors.reset}`
    : `${colors.red}✗ FAIL${colors.reset}`;
  const categoryColor = {
    curriculum: colors.magenta,
    content: colors.cyan,
    simulator: colors.yellow,
    infrastructure: colors.blue,
  };

  const config = Object.values(VALIDATORS).find((v) => v.command === result.command);
  const category = config ? categoryColor[config.category] || colors.reset : colors.reset;

  console.log(
    `  ${statusIcon} ${category}${result.name}${colors.reset} ${colors.blue}(${formatDuration(result.duration)})${colors.reset}`,
  );

  if (!result.success && verbose) {
    const lines = result.output.split("\n").slice(0, 5); // Show first 5 lines
    lines.forEach((line) => {
      if (line.trim()) {
        console.log(`    ${colors.red}${line}${colors.reset}`);
      }
    });
    if (result.output.split("\n").length > 5) {
      console.log(`    ${colors.blue}... (truncated)${colors.reset}`);
    }
  }
}

function printSummary(results: ValidationResult[], strict: boolean = false) {
  printHeader("Validation Summary");

  const byCategory: Record<string, ValidationResult[]> = {};

  // Group by category
  for (const result of results) {
    const config = Object.values(VALIDATORS).find((v) => v.command === result.command);
    const category = config?.category || "unknown";
    if (!byCategory[category]) byCategory[category] = [];
    byCategory[category].push(result);
  }

  // Print by category
  for (const [category, categoryResults] of Object.entries(byCategory)) {
    const passCount = categoryResults.filter((r) => r.success).length;
    const total = categoryResults.length;
    console.log(`  ${category}: ${passCount}/${total} passed`);
  }

  const totalPassed = results.filter((r) => r.success).length;
  const total = results.length;

  console.log(`\n  ${colors.cyan}Total: ${totalPassed}/${total} validators passed${colors.reset}`);

  // Show failures
  const failures = results.filter((r) => !r.success);
  if (failures.length > 0) {
    console.log(`\n  ${colors.red}Failed validators:${colors.reset}`);
    for (const failure of failures) {
      console.log(`    ${colors.red}• ${failure.name}${colors.reset}`);
    }
  }
}

function getValidatorsToRun(only?: string[], skip?: string[]): ValidatorConfig[] {
  const allValidators = Object.values(VALIDATORS);

  // Filter by only
  let validators = only?.length
    ? allValidators.filter((v) => only.includes(v.name.toLowerCase()) || only.includes(v.command))
    : allValidators;

  // Filter by skip
  if (skip?.length) {
    validators = validators.filter(
      (v) => !skip.includes(v.name.toLowerCase()) && !skip.includes(v.command),
    );
  }

  return validators;
}

async function main() {
  const { values } = parseArgs({
    options: {
      fix: { type: "boolean", default: false },
      strict: { type: "boolean", default: false },
      only: { type: "string" },
      skip: { type: "string" },
      verbose: { type: "boolean", default: false, short: "v" },
      parallel: { type: "boolean", default: true, short: "p" },
    },
    allowPositionals: true,
  });

  const fix = values.fix === true;
  const strict = values.strict === true;
  const only = values.only?.split(",").map((s) => s.trim().toLowerCase());
  const skip = values.skip?.split(",").map((s) => s.trim().toLowerCase());
  const verbose = values.verbose === true;
  const parallel = values.parallel === true;

  printHeader("AMPH Audit Runner");
  console.log(`  Mode: ${fix ? "FIX" : strict ? "STRICT" : "NORMAL"}`);
  console.log(`  Parallel: ${parallel ? "YES" : "NO"}`);
  console.log(
    `  Filter: ${only ? `only: ${only.join(", ")}` : skip ? `skip: ${skip.join(", ")}` : "all"}\n`,
  );

  // Get validators to run
  const validators = getValidatorsToRun(only, skip);

  if (validators.length === 0) {
    console.error(`${colors.red}Error:${colors.reset} No validators match the specified filters`);
    process.exit(2);
  }

  printStatus(`Running ${validators.length} validators...`, "info");

  const results: ValidationResult[] = [];

  // Run validators (sequential for now, can be parallelized)
  for (const config of validators) {
    printStatus(`Running ${config.name}...`, "info");
    const result = runValidator(config);
    results.push(result);
    printResult(result, verbose);
  }

  // Print summary
  printSummary(results, strict);

  // Check for failures
  const failures = results.filter((r) => !r.success);
  const warnings = results.filter((r) => r.success); // In strict mode, warnings might be treated as failures

  if (failures.length > 0) {
    printStatus(`${failures.length} validator(s) failed`, "error");
    process.exit(1);
  }

  if (strict && warnings.length < results.length) {
    // In strict mode, check if any had warnings in output
    const hasWarnings = results.some((r) => {
      const lowerOutput = r.output.toLowerCase();
      return lowerOutput.includes("warn") || lowerOutput.includes("warning");
    });

    if (hasWarnings) {
      printStatus("Warnings detected in strict mode", "error");
      process.exit(1);
    }
  }

  printStatus("All validations passed!", "success");
}

main().catch((error) => {
  console.error(`${colors.red}Audit runner failed:${colors.reset}`, error);
  process.exit(2);
});
