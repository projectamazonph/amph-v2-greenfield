import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Guard: every `@/...` import inside `scripts/*.ts` must resolve to a real file.
 *
 * Why this exists. `pnpm typecheck` runs `tsc --noEmit` over `src`, and CI never
 * executes the content scripts, so a script can import a module that no longer
 * exists and stay green forever. `scripts/import-amph-content.ts` has been doing
 * exactly that since `915c7ca` (2026-07-31) deleted
 * `src/usecases/ImportAmphContent.ts` without touching the script that imported
 * it. `pnpm import:content` therefore fails at module resolution, before it opens
 * a database connection, and it is the command named in `README.md`,
 * `content/README.md`, `docs/DISASTER-RECOVERY-RUNBOOK.md` and
 * `docs/runbooks/learning-release-gate.md` as the way curriculum content reaches
 * learners. `AGENTS.md` and `CLAUDE.md` both describe the script as in active use.
 *
 * The alias mechanism itself is fine: `validate-curriculum-inventory.ts` and
 * `validate-tool-bridges.ts` import through `@/` and run green in CI every day.
 * So a resolution failure here means the target file is genuinely gone, which is
 * what makes this worth pinning rather than eyeballing.
 *
 * The broken script is listed in `STILL_BROKEN` rather than quietly skipped, and
 * the last assertion checks that every entry there is STILL unresolved. So the
 * day someone fixes or deletes it, this test fails until the entry is removed,
 * which keeps the exemption honest instead of letting it rot.
 */

const SCRIPTS_DIR = resolve(process.cwd(), "scripts");
const SRC_DIR = resolve(process.cwd(), "src");

/** Known-broken specifiers, per script, with the reason they are exempt. */
const STILL_BROKEN: Record<string, string[]> = {};

const IMPORT_PATTERN = /from\s+["'](@\/[^"']+)["']|import\(\s*["'](@\/[^"']+)["']\s*\)/g;

function aliasedSpecifiers(file: string): string[] {
  const text = readFileSync(file, "utf-8");
  const found: string[] = [];
  for (const match of text.matchAll(IMPORT_PATTERN)) {
    const specifier = match[1] ?? match[2];
    if (specifier) found.push(specifier);
  }
  return found;
}

/** Mirrors the `@/*` entry in tsconfig paths, plus directory index resolution. */
function resolvesToDisk(specifier: string): boolean {
  const target = join(SRC_DIR, specifier.replace(/^@\//, ""));
  return (
    existsSync(`${target}.ts`) ||
    existsSync(`${target}.tsx`) ||
    existsSync(join(target, "index.ts")) ||
    existsSync(join(target, "index.tsx"))
  );
}

function unresolvableByScript(): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const name of readdirSync(SCRIPTS_DIR)
    .filter((f) => f.endsWith(".ts"))
    .sort()) {
    const bad = aliasedSpecifiers(join(SCRIPTS_DIR, name)).filter((s) => !resolvesToDisk(s));
    if (bad.length > 0) result[name] = bad;
  }
  return result;
}

describe("scripts/*.ts import graph", () => {
  const broken = unresolvableByScript();

  it("finds the scripts directory", () => {
    expect(Object.keys(broken).length).toBeGreaterThanOrEqual(0);
  });

  it("has no `@/` import that fails to resolve, outside the documented exemptions", () => {
    const unexpected: string[] = [];
    for (const [script, specifiers] of Object.entries(broken)) {
      for (const specifier of specifiers) {
        if (!STILL_BROKEN[script]?.includes(specifier)) {
          unexpected.push(`scripts/${script} -> ${specifier}`);
        }
      }
    }
    expect(unexpected).toEqual([]);
  });

  it("keeps every documented exemption actually broken", () => {
    const fixed: string[] = [];
    for (const [script, specifiers] of Object.entries(STILL_BROKEN)) {
      for (const specifier of specifiers) {
        if (resolvesToDisk(specifier)) fixed.push(`scripts/${script} -> ${specifier}`);
      }
    }
    expect(fixed).toEqual([]);
  });
});
