/**
 * Regression test for scripts/validate-lesson-production.ts.
 *
 * Runs the validator as a subprocess against the live curriculum tree
 * and asserts it reports the expected contract: 45/45 lessons
 * complete and no active-practice block issues. A failure here means
 * a future change to either the lesson bodies or the validator logic
 * has broken the build's lesson-production invariant.
 *
 * The lesson-reader counterpart (each SelfCheck must have a parseable
 * options={["a", "b"]} and answerIndex={N}) is covered separately by
 * `src/domain/curriculum/__tests__/SelfCheckBlocks.test.ts`. That test
 * parses each lesson body with its own attribute regex and exercises
 * the reader path; this one exercises the validator path.
 */
import { execFile } from "node:child_process";
import { join } from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);

// vitest runs from the project root, but Node's `cwd` for child_process
// spawn doesn't resolve relative paths consistently on Windows (the
// `.bin/tsx` shim is a batch file, not a native executable). Anchor
// the binary at the project root, computed from this file's location.
const REPO_ROOT = join(__dirname, "..", "..", "..");
const TSX_BIN = join(REPO_ROOT, "node_modules", ".bin", "tsx.cmd");

interface ValidatorResult {
  stdout: string;
  stderr: string;
}

describe("validate-lesson-production.ts (subprocess smoke)", () => {
  it("reports 45/45 lessons complete with no active-practice block issues", async () => {
    // Pass the whole command as a single string so `shell: true` is
    // safe (no user-controlled input). Avoids Node 20's deprecation
    // warning about unsanitized args with shell.
    const result: ValidatorResult = await execFileAsync(
      `"${TSX_BIN}" "scripts/validate-lesson-production.ts"`,
      { cwd: REPO_ROOT, maxBuffer: 8 * 1024 * 1024, shell: true },
    ).catch((err: ValidatorResult) => ({
      stdout: err.stdout ?? "",
      stderr: err.stderr ?? "",
    }));
    const combined = (result.stdout ?? "") + (result.stderr ?? "");

    // The lesson-count line must report all 45 lessons complete.
    expect(combined).toMatch(/Lesson production contract: 45\/45 lessons complete/);
    // No block-issue summary line with a non-zero count. The
    // validator only prints this line when issues exist.
    expect(combined).not.toMatch(/Active-practice block issues: [1-9]/);
    // No individual block-issue lines on stderr or stdout.
    expect(combined).not.toMatch(/SelfCheck is missing required/);
    expect(combined).not.toMatch(/callout id '\S+' must be lowercase/);
    expect(combined).not.toMatch(/SelfCheck answerIndex must be in/);
  }, 120_000);
});
