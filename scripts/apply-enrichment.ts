/**
 * scripts/apply-enrichment.ts
 *
 * Unified visual enrichment pipeline that reads from YAML config
 * and applies visual blocks to MDX lesson files.
 *
 * Usage:
 *   pnpm tsx scripts/apply-enrichment.ts              # Apply all enrichments
 *   pnpm tsx scripts/apply-enrichment.ts --dry-run   # Preview changes
 *   pnpm tsx scripts/apply-enrichment.ts --force     # Overwrite existing blocks
 *   pnpm tsx scripts/apply-enrichment.ts --only "1-foundations/*"  # Filter by pattern
 *
 * Requires: yaml, glob
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { globSync } from "glob";
import { load } from "js-yaml";
import { resolve, relative } from "node:path";

// ANSI color codes
const colors = {
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
  blue: "\x1b[34m",
  reset: "\x1b[0m",
};

interface EnrichmentConfig {
  enrichment?: {
    default_insert_before?: string;
    default_insert_after?: string;
    skip_if_contains?: string[];
  };
  rules?: EnrichmentRule[];
}

interface EnrichmentRule {
  file?: string;
  insert?: string;
  action?: "insert" | "add_attribute" | "remove_block";
  before?: string;
  after?: string;
  target_block_id?: string;
  attribute?: string;
  skip_if_contains?: string[];
}

// Regex patterns
const FENCE_OPEN = /^:::([a-zA-Z][a-zA-Z0-9-]*)\{([^}]*)\}\s*$/;
const FENCE_CLOSE = /^:::\s*$/;
const ATTR_PATTERN = /([a-zA-Z][a-zA-Z0-9-]*)="([^"]*)"/g;

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

function parseAttrs(attrs: string): Record<string, string> {
  const result: Record<string, string> = {};
  let match;
  while ((match = ATTR_PATTERN.exec(attrs)) !== null) {
    result[match[1]] = match[2];
  }
  return result;
}

function extractBlockId(line: string): string | null {
  const match = line.match(FENCE_OPEN);
  if (!match) return null;
  const attrs = parseAttrs(match[2]);
  return attrs.id || null;
}

function findInsertPosition(
  content: string,
  beforeMarker: string | undefined,
  afterMarker: string | undefined,
): number | null {
  if (beforeMarker) {
    const pos = content.indexOf(beforeMarker);
    if (pos !== -1) return pos;
  }
  if (afterMarker) {
    const pos = content.indexOf(afterMarker);
    if (pos !== -1) return pos + afterMarker.length;
  }
  return null;
}

function shouldSkipFile(content: string, skipPatterns: string[] = []): boolean {
  return skipPatterns.some((pattern) => content.includes(pattern));
}

function applyInsertion(content: string, insertion: string, position: number): string {
  // Ensure proper spacing
  const beforeContent = content.slice(0, position);
  const afterContent = content.slice(position);

  // Add newlines if needed
  const needsNewlineBefore = beforeContent.length > 0 && !beforeContent.endsWith("\n");
  const needsNewlineAfter = afterContent.length > 0 && !afterContent.startsWith("\n");

  return (
    beforeContent +
    (needsNewlineBefore ? "\n" : "") +
    insertion +
    (needsNewlineAfter ? "\n" : "") +
    afterContent
  );
}

function addAttributeToBlock(content: string, blockId: string, attribute: string): string {
  const lines = content.split("\n");
  const result: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Check if this is the opening fence of our target block
    if (trimmed.match(FENCE_OPEN)) {
      const attrs = parseAttrs(trimmed.match(FENCE_OPEN)![2]);
      if (attrs.id === blockId) {
        // Check if attribute already exists
        if (!trimmed.includes(attribute)) {
          // Add the attribute
          const newLine = trimmed.replace("}", ` ${attribute} }`);
          result.push(newLine);
          printStatus(`Added attribute ${attribute} to block ${blockId}`, "info");
          continue;
        } else {
          printStatus(`Attribute ${attribute} already exists in block ${blockId}`, "warning");
        }
      }
    }
    result.push(line);
  }

  return result.join("\n");
}

function removeBlock(content: string, blockId: string): string {
  const lines = content.split("\n");
  const result: string[] = [];
  let inTargetBlock = false;
  let skipLines = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (skipLines) {
      if (trimmed.match(FENCE_CLOSE)) {
        skipLines = false;
        printStatus(`Removed block ${blockId}`, "info");
      }
      continue;
    }

    if (trimmed.match(FENCE_OPEN)) {
      const attrs = parseAttrs(trimmed.match(FENCE_OPEN)![2]);
      if (attrs.id === blockId) {
        inTargetBlock = true;
        skipLines = true;
        // Remove preceding blank line if exists
        if (result.length > 0 && result[result.length - 1].trim() === "") {
          result.pop();
        }
        continue;
      }
    }

    result.push(line);
  }

  return result.join("\n");
}

function processFile(filePath: string, rules: EnrichmentRule[], dryRun: boolean = false): boolean {
  let content = readFileSync(filePath, "utf-8");
  let modified = false;

  for (const rule of rules) {
    // Filter by file pattern
    if (rule.file) {
      // Convert glob pattern to regex
      const pattern = rule.file.replace(/\*/g, ".*").replace(/\?/g, ".").replace(/\./g, "\\.");
      const regex = new RegExp(`^${pattern}$`);
      if (!regex.test(relative(process.cwd(), filePath))) {
        continue;
      }
    }

    // Check skip conditions
    if (shouldSkipFile(content, rule.skip_if_contains)) {
      printStatus(`Skipping ${filePath} - already contains block`, "warning");
      continue;
    }

    let newContent: string | null = null;

    switch (rule.action) {
      case "add_attribute":
        if (rule.target_block_id && rule.attribute) {
          newContent = addAttributeToBlock(content, rule.target_block_id, rule.attribute);
        }
        break;

      case "remove_block":
        if (rule.target_block_id) {
          newContent = removeBlock(content, rule.target_block_id);
        }
        break;

      case "insert":
      default:
        if (rule.insert) {
          const position = findInsertPosition(content, rule.before, rule.after);

          if (position !== null) {
            newContent = applyInsertion(content, rule.insert, position);
          } else {
            printStatus(`Could not find insertion point in ${filePath}`, "warning");
          }
        }
        break;
    }

    if (newContent && newContent !== content) {
      if (dryRun) {
        printStatus(`[DRY RUN] Would modify ${filePath}`, "info");
      } else {
        content = newContent;
        modified = true;
      }
    }
  }

  if (modified && !dryRun) {
    writeFileSync(filePath, content, "utf-8");
    return true;
  }

  return false;
}

async function main() {
  const { values } = parseArgs({
    options: {
      "dry-run": { type: "boolean", default: false },
      force: { type: "boolean", default: false },
      only: { type: "string" },
      verbose: { type: "boolean", default: false, short: "v" },
    },
    allowPositionals: true,
  });

  const dryRun = values["dry-run"] === true;
  const force = values.force === true;
  const onlyPattern = values.only;
  const verbose = values.verbose === true;

  printHeader("Visual Enrichment Pipeline");
  console.log(`  Mode: ${dryRun ? "DRY RUN" : force ? "FORCE" : "NORMAL"}`);
  console.log(`  Pattern: ${onlyPattern || "all files"}\n`);

  // Load configuration
  const configPath = resolve(process.cwd(), "scripts", "enrichment-config.yaml");
  if (!existsSync(configPath)) {
    console.error(
      `${colors.red}Error:${colors.reset} enrichment-config.yaml not found at ${configPath}`,
    );
    process.exit(1);
  }

  const config = load(readFileSync(configPath, "utf-8")) as EnrichmentConfig;
  const rules = config.rules || [];

  if (rules.length === 0) {
    console.error(`${colors.red}Error:${colors.reset} No enrichment rules found in config`);
    process.exit(1);
  }

  // Find all MDX files
  const mdxFiles = globSync("content/curriculum/modules/**/*.mdx", {
    cwd: process.cwd(),
    absolute: true,
  });

  if (mdxFiles.length === 0) {
    console.error(`${colors.red}Error:${colors.reset} No MDX files found`);
    process.exit(1);
  }

  // Filter by pattern if specified
  let targetFiles = mdxFiles;
  if (onlyPattern) {
    const pattern = onlyPattern.replace(/\*/g, ".*").replace(/\?/g, ".").replace(/\./g, "\\.");
    const regex = new RegExp(pattern);
    targetFiles = mdxFiles.filter((f) => regex.test(relative(process.cwd(), f)));
  }

  printStatus(`Found ${targetFiles.length} MDX files to process`, "info");

  let modifiedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const filePath of targetFiles.sort()) {
    try {
      if (verbose) {
        console.log(`\n  Processing: ${relative(process.cwd(), filePath)}`);
      }

      const modified = processFile(filePath, rules, dryRun);

      if (modified) {
        modifiedCount++;
        printStatus(`Modified: ${relative(process.cwd(), filePath)}`, "success");
      } else {
        skippedCount++;
        if (verbose) {
          printStatus(`No changes: ${relative(process.cwd(), filePath)}`, "info");
        }
      }
    } catch (error) {
      errorCount++;
      console.error(`${colors.red}Error processing ${filePath}:${colors.reset}`, error);
    }
  }

  printHeader("Enrichment Summary");
  console.log(`  Modified: ${modifiedCount}`);
  console.log(`  Skipped: ${skippedCount}`);
  console.log(`  Errors: ${errorCount}`);

  if (errorCount > 0) {
    console.error(`\n${colors.red}Completed with ${errorCount} error(s)${colors.reset}`);
    process.exit(1);
  }

  if (dryRun) {
    console.log(`\n${colors.yellow}Dry run complete - no changes were made${colors.reset}\n`);
  } else {
    console.log(`\n${colors.green}Enrichment complete!${colors.reset}\n`);
  }
}

main().catch((error) => {
  console.error(`${colors.red}Enrichment failed:${colors.reset}`, error);
  process.exit(1);
});
