/**
 * scripts/validate-simulator-data.ts
 *
 * Validates simulator scenario and policy data consistency.
 * Checks that all referenced IDs exist and data structures are valid.
 *
 * Usage:
 *   pnpm tsx scripts/validate-simulator-data.ts              # Validate all
 *   pnpm tsx scripts/validate-simulator-data.ts --scenarios   # Only scenarios
 *   pnpm tsx scripts/validate-simulator-data.ts --policies    # Only policies
 *   pnpm tsx scripts/validate-simulator-data.ts --strict     # Treat warnings as errors
 *
 * Exit codes:
 *   0 - All validations passed
 *   1 - Validation failures found
 */

import { existsSync, readFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { resolve } from "node:path";

// ANSI color codes
const colors = {
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
  blue: "\x1b[34m",
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

interface ValidationIssue {
  severity: "error" | "warning" | "info";
  code: string;
  message: string;
  file?: string;
  line?: number;
  details?: Record<string, unknown>;
}

interface ValidationResult {
  validator: string;
  issues: ValidationIssue[];
  passed: boolean;
}

// Import policy definitions from simulator-policies.ts
// We'll use a dynamic import to avoid circular dependencies
async function loadPolicies() {
  try {
    const module = await import("./simulator-policies.js");
    return module.POLICIES || [];
  } catch {
    // Fallback: try TypeScript import
    try {
      const module = await import("./simulator-policies.ts");
      return module.POLICIES || [];
    } catch {
      return [];
    }
  }
}

// Import scenario definitions from seed-simulator-scenarios.ts
async function loadScenarios() {
  try {
    const module = await import("./seed-simulator-scenarios.js");
    return module.SCENARIOS || [];
  } catch {
    return [];
  }
}

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

function printIssue(issue: ValidationIssue) {
  const severityColor = {
    error: colors.red,
    warning: colors.yellow,
    info: colors.blue,
  };
  const color = severityColor[issue.severity] || colors.reset;
  const severityLabel = issue.severity.toUpperCase().padEnd(7);

  console.log(`    ${color}[${severityLabel}]${colors.reset} ${issue.code}: ${issue.message}`);
  if (issue.file) {
    console.log(`        File: ${issue.file}${issue.line ? `:${issue.line}` : ""}`);
  }
  if (issue.details && Object.keys(issue.details).length > 0) {
    console.log(`        Details: ${JSON.stringify(issue.details)}`);
  }
}

// Validate policy weight sums
function validatePolicyWeights(
  policies: Array<{ id: string; dimensionConfig: Record<string, number> }>,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const policy of policies) {
    const weights = Object.values(policy.dimensionConfig);
    const sum = weights.reduce((a, b) => a + b, 0);

    // Allow for floating point precision
    const tolerance = 0.0001;

    if (Math.abs(sum - 1.0) > tolerance) {
      issues.push({
        severity: "error",
        code: "POLICY_WEIGHT_SUM",
        message: `Policy ${policy.id} weights sum to ${sum.toFixed(4)}, expected 1.0`,
        details: { policyId: policy.id, sum, weights: policy.dimensionConfig },
      });
    }

    // Check for negative weights
    for (const [dim, weight] of Object.entries(policy.dimensionConfig)) {
      if (weight < 0) {
        issues.push({
          severity: "error",
          code: "NEGATIVE_WEIGHT",
          message: `Policy ${policy.id} has negative weight for dimension ${dim}: ${weight}`,
          details: { policyId: policy.id, dimension: dim, weight },
        });
      }
    }

    // Check for NaN or Infinity
    for (const [dim, weight] of Object.entries(policy.dimensionConfig)) {
      if (!Number.isFinite(weight)) {
        issues.push({
          severity: "error",
          code: "INVALID_WEIGHT",
          message: `Policy ${policy.id} has invalid weight for dimension ${dim}: ${weight}`,
          details: { policyId: policy.id, dimension: dim, weight },
        });
      }
    }
  }

  return issues;
}

// Validate scenario structure
function validateScenarioStructure(
  scenarios: Array<{
    id: string;
    simulatorId: string;
    name: string;
    description: string;
    inputSchema: Record<string, unknown>;
  }>,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const scenario of scenarios) {
    // Check required fields
    if (!scenario.id) {
      issues.push({
        severity: "error",
        code: "MISSING_SCENARIO_ID",
        message: "Scenario is missing required id field",
        details: { scenario },
      });
      continue;
    }

    if (!scenario.simulatorId) {
      issues.push({
        severity: "error",
        code: "MISSING_SIMULATOR_ID",
        message: `Scenario ${scenario.id} is missing required simulatorId field`,
        details: { scenarioId: scenario.id },
      });
    }

    if (!scenario.name) {
      issues.push({
        severity: "warning",
        code: "MISSING_SCENARIO_NAME",
        message: `Scenario ${scenario.id} is missing name field`,
        details: { scenarioId: scenario.id },
      });
    }

    if (!scenario.inputSchema || Object.keys(scenario.inputSchema).length === 0) {
      issues.push({
        severity: "warning",
        code: "EMPTY_INPUT_SCHEMA",
        message: `Scenario ${scenario.id} has empty or missing inputSchema`,
        details: { scenarioId: scenario.id },
      });
    }
  }

  return issues;
}

// Validate scenario IDs match frontend references
function validateScenarioIdConsistency(
  scenarios: Array<{ id: string; simulatorId: string }>,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Known simulator IDs from the codebase
  const knownSimulators = new Set([
    "bid-elevator",
    "str-triage",
    "campaign-builder",
    "listing-audit",
    "keyword-research",
  ]);

  // Check for duplicate scenario IDs
  const seenIds = new Map<string, string>();
  for (const scenario of scenarios) {
    if (seenIds.has(scenario.id)) {
      issues.push({
        severity: "error",
        code: "DUPLICATE_SCENARIO_ID",
        message: `Duplicate scenario ID: ${scenario.id} (first seen for ${seenIds.get(scenario.id)})`,
        details: { scenarioId: scenario.id, firstSimulator: seenIds.get(scenario.id) },
      });
    } else {
      seenIds.set(scenario.id, scenario.simulatorId);
    }

    // Check if simulatorId is known
    if (!knownSimulators.has(scenario.simulatorId)) {
      issues.push({
        severity: "warning",
        code: "UNKNOWN_SIMULATOR",
        message: `Scenario ${scenario.id} references unknown simulator: ${scenario.simulatorId}`,
        details: { scenarioId: scenario.id, simulatorId: scenario.simulatorId },
      });
    }
  }

  return issues;
}

// Validate policy IDs are unique
function validatePolicyIds(
  policies: Array<{ id: string; simulatorId: string; difficulty: string; mode: string }>,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  const seenIds = new Map<string, string>();
  for (const policy of policies) {
    const key = `${policy.simulatorId}:${policy.difficulty}:${policy.mode}`;

    if (seenIds.has(key)) {
      issues.push({
        severity: "error",
        code: "DUPLICATE_POLICY",
        message: `Duplicate policy for ${policy.simulatorId}/${policy.difficulty}/${policy.mode}`,
        details: { policyId: policy.id, key },
      });
    } else {
      seenIds.set(key, policy.id);
    }
  }

  return issues;
}

// Validate passing scores are reasonable
function validatePassingScores(
  policies: Array<{ id: string; passingScore: number }>,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const policy of policies) {
    if (policy.passingScore < 0 || policy.passingScore > 100) {
      issues.push({
        severity: "error",
        code: "INVALID_PASSING_SCORE",
        message: `Policy ${policy.id} has invalid passingScore: ${policy.passingScore} (must be 0-100)`,
        details: { policyId: policy.id, passingScore: policy.passingScore },
      });
    }
  }

  return issues;
}

// Cross-validate scenarios and policies
function validateScenarioPolicyAlignment(
  scenarios: Array<{ simulatorId: string }>,
  policies: Array<{ simulatorId: string }>,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  const scenarioSimulators = new Set(scenarios.map((s) => s.simulatorId));
  const policySimulators = new Set(policies.map((p) => p.simulatorId));

  // Check for simulators with scenarios but no policies
  for (const sim of scenarioSimulators) {
    if (!policySimulators.has(sim)) {
      issues.push({
        severity: "warning",
        code: "MISSING_POLICIES",
        message: `Simulator ${sim} has scenarios but no scoring policies`,
        details: { simulatorId: sim },
      });
    }
  }

  // Check for simulators with policies but no scenarios
  for (const sim of policySimulators) {
    if (!scenarioSimulators.has(sim)) {
      issues.push({
        severity: "warning",
        code: "MISSING_SCENARIOS",
        message: `Simulator ${sim} has policies but no scenarios`,
        details: { simulatorId: sim },
      });
    }
  }

  return issues;
}

async function main() {
  const { values } = parseArgs({
    options: {
      scenarios: { type: "boolean", default: false },
      policies: { type: "boolean", default: false },
      strict: { type: "boolean", default: false },
      verbose: { type: "boolean", default: false, short: "v" },
    },
    allowPositionals: true,
  });

  const validateScenarios = values.scenarios === true || Object.keys(values).length === 0;
  const validatePolicies = values.policies === true || Object.keys(values).length === 0;
  const strict = values.strict === true;
  const verbose = values.verbose === true;

  printHeader("Simulator Data Validator");
  console.log(
    `  Validating: ${validateScenarios ? "scenarios " : ""}${validatePolicies ? "policies" : ""}`,
  );
  console.log(`  Mode: ${strict ? "STRICT" : "NORMAL"}\n`);

  const allIssues: ValidationIssue[] = [];
  const results: ValidationResult[] = [];

  // Load and validate scenarios
  if (validateScenarios) {
    printStatus("Validating scenarios...", "info");
    const scenarios = await loadScenarios();

    if (scenarios.length === 0) {
      printStatus("No scenarios found to validate", "warning");
    } else {
      const scenarioIssues: ValidationIssue[] = [
        ...validateScenarioStructure(scenarios),
        ...validateScenarioIdConsistency(scenarios),
      ];

      allIssues.push(...scenarioIssues);

      results.push({
        validator: "Scenario Structure",
        issues: scenarioIssues,
        passed: scenarioIssues.length === 0,
      });

      printStatus(
        `Found ${scenarioIssues.length} issue(s) in scenarios`,
        scenarioIssues.length === 0 ? "success" : "error",
      );
    }
  }

  // Load and validate policies
  if (validatePolicies) {
    printStatus("Validating policies...", "info");
    const policies = await loadPolicies();

    if (policies.length === 0) {
      printStatus("No policies found to validate", "warning");
    } else {
      const policyIssues: ValidationIssue[] = [
        ...validatePolicyWeights(policies),
        ...validatePolicyIds(policies),
        ...validatePassingScores(policies),
      ];

      allIssues.push(...policyIssues);

      results.push({
        validator: "Policy Structure",
        issues: policyIssues,
        passed: policyIssues.length === 0,
      });

      printStatus(
        `Found ${policyIssues.length} issue(s) in policies`,
        policyIssues.length === 0 ? "success" : "error",
      );
    }
  }

  // Cross-validation
  if (validateScenarios && validatePolicies) {
    printStatus("Validating scenario/policy alignment...", "info");
    const scenarios = await loadScenarios();
    const policies = await loadPolicies();

    const alignmentIssues = validateScenarioPolicyAlignment(scenarios, policies);
    allIssues.push(...alignmentIssues);

    results.push({
      validator: "Alignment",
      issues: alignmentIssues,
      passed: alignmentIssues.length === 0,
    });

    printStatus(
      `Found ${alignmentIssues.length} alignment issue(s)`,
      alignmentIssues.length === 0 ? "success" : "warning",
    );
  }

  // Print summary
  printHeader("Validation Results");

  for (const result of results) {
    const status = result.passed
      ? `${colors.green}✓ PASS${colors.reset}`
      : `${colors.red}✗ FAIL${colors.reset}`;
    console.log(`  ${status} ${result.validator}: ${result.issues.length} issue(s)`);
  }

  // Print issues
  if (allIssues.length > 0) {
    printHeader("Issues Found");

    const errors = allIssues.filter((i) => i.severity === "error");
    const warnings = allIssues.filter((i) => i.severity === "warning");
    const infos = allIssues.filter((i) => i.severity === "info");

    if (errors.length > 0) {
      console.log(`\n  ${colors.red}Errors (${errors.length}):${colors.reset}`);
      for (const error of errors) {
        printIssue(error);
      }
    }

    if (warnings.length > 0) {
      console.log(`\n  ${colors.yellow}Warnings (${warnings.length}):${colors.reset}`);
      for (const warning of warnings) {
        printIssue(warning);
      }
    }

    if (infos.length > 0) {
      console.log(`\n  ${colors.blue}Info (${infos.length}):${colors.reset}`);
      for (const info of infos) {
        printIssue(info);
      }
    }
  }

  // Determine exit code
  const hasErrors = allIssues.some((i) => i.severity === "error");
  const hasWarnings = allIssues.some((i) => i.severity === "warning");

  if (hasErrors) {
    printStatus("Validation failed due to errors", "error");
    process.exit(1);
  }

  if (strict && hasWarnings) {
    printStatus("Validation failed due to warnings (strict mode)", "error");
    process.exit(1);
  }

  printStatus("All validations passed!", "success");
}

main().catch((error) => {
  console.error(`${colors.red}Validation failed:${colors.reset}`, error);
  process.exit(2);
});
