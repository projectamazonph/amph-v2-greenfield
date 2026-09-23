import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname, relative } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Guard: every concrete repo path named in the guidance documents must exist.
 *
 * Why this exists. `docs/audit-2026-07-27-completeness-review.md` was deleted on
 * 2026-09-14 by `e1f7352` ("consolidate documentation, remove 60+ stale/superseded
 * files", PR #513), and `AGENTS.md` still told a reader to open it as step 4 of
 * "When you're not sure". Four other current-guidance files cite it too. The
 * consolidation was reasonable; the dangling half of it was not, and nothing
 * checked. Scanning the eight guidance files found 11 dead targets, including
 * `src/composition/testContainer.ts`, which `AGENTS.md` names as the home of
 * `buildTestContainer()` when that builder actually lives in
 * `src/composition/container.test.ts`.
 *
 * Scope is deliberately narrow: the files that describe the repository as it is
 * now. `CHANGELOG.md`, `docs/stories/*`, `SESSION-HANDOVER.md`'s dated entries and
 * the audit write-ups are retained history and `docs/README.md` says so, so a path
 * that has since moved inside them is correct as written and is not failed here.
 *
 * Placeholders (`STORY-XXX.md`, `<feature>.ts`, globs) are filtered out by shape.
 * What remains, `KNOWN_ABSENT` exempts by name with a reason, and the last
 * assertion fails if an exempted path ever comes back into existence, so the
 * exemption cannot rot into a stale claim the way the deleted audits did.
 */

const ROOT = resolve(process.cwd());

/** Files that describe the current repository, not a moment in its history. */
const GUIDANCE_DOCS = [
  "AGENTS.md",
  "CLAUDE.md",
  "README.md",
  "FEATURES.md",
  "STATE.md",
  "docs/README.md",
  "docs/runbooks/README.md",
  "content/README.md",
];

const PATH_IN_BACKTICKS =
  /`((?:docs|content|scripts|src|prisma|tests)\/[\w\-./@]+\.(?:md|mdx|json|ts|tsx|mjs|cjs|js|prisma|yml|yaml|sql))`/g;

/**
 * Markdown link targets, which is how `docs/README.md` indexes the whole
 * documentation set. Anchors are stripped, and external or absolute targets are
 * left alone because this guard is about files inside the repository.
 */
const LINK_TARGET = /\]\(([^)\s]+)\)/g;
const FILE_EXTENSION = /\.(?:md|mdx|json|ts|tsx|js|mjs|png|svg|html)$/;

/** Template names, globs and elisions are instructions, not files. */
const PLACEHOLDER_SHAPE = /[<>*{}$?]|XXX|NNN/;

/**
 * Cited precisely because they do not exist. Each entry is a claim the prose makes
 * about an absence, so the reference must stay absent for the prose to be true.
 */
const KNOWN_ABSENT: Record<string, string> = {
  "src/usecases/ImportAmphContent.ts":
    "deleted by 915c7ca; CLAUDE.md and STATE.md cite it to explain why pnpm import:content cannot run",
  "src/infra/payment/PayMongoAdapter.test.ts":
    "moved into __tests__/ by the 2026-08-02 session; CLAUDE.md names the old path to record that it was never collected",
  "docs/audit-2026-07-27-completeness-review.md":
    "removed on 2026-09-14 by e1f7352 (PR #513); AGENTS.md, CLAUDE.md, README.md and FEATURES.md now name it as gone",
  "docs/audit-2026-07-26-simulator-accuracy-review.md":
    "removed on 2026-09-14 by e1f7352; CLAUDE.md cites it as the source of the pre-Sprint-14 findings",
  "docs/ULTRA-REVIEW-2026-08-14.md":
    "removed on 2026-09-14 by e1f7352; STATE.md cites it above the triage table that is its only surviving copy",
  "docs/CONTENT-AUDIT-2026-07-16.md":
    "parent-repository file, never committed here; content/README.md says so instead of sending a reader looking",
  "docs/CONTENT-UPDATE-PLAN.md":
    "parent-repository file, never committed here; content/README.md says so instead of sending a reader looking",
  "docs/CURRICULUM-REDESIGN.md":
    "parent-repository file, never committed here; AGENTS.md names it to explain where the three-course framing came from",
  "docs/0-1-welcome-to-amph.md":
    "parent-repository file, never committed here; AGENTS.md names it beside the lesson that replaced it",
  "docs/1-1-read-ppc-data-before-you-change-it.md":
    "parent-repository file, never committed here; AGENTS.md names it beside the lesson that replaced it",
};

type Ref = { doc: string; line: number; path: string };

function collectRefs(): Ref[] {
  const refs: Ref[] = [];
  for (const doc of GUIDANCE_DOCS) {
    const text = readFileSync(resolve(ROOT, doc), "utf8");
    const baseDir = dirname(resolve(ROOT, doc));
    const lineOf = (index: number) => text.slice(0, index).split("\n").length;

    for (const match of text.matchAll(PATH_IN_BACKTICKS)) {
      const path = match[1];
      if (!path || PLACEHOLDER_SHAPE.test(path)) continue;
      refs.push({ doc, line: lineOf(match.index), path });
    }

    for (const match of text.matchAll(LINK_TARGET)) {
      const target = match[1]?.split("#")[0];
      if (!target || !FILE_EXTENSION.test(target)) continue;
      if (/^[a-z]+:/i.test(target) || target.startsWith("/")) continue;
      if (PLACEHOLDER_SHAPE.test(target)) continue;
      const normalized = relative(ROOT, resolve(baseDir, target)).replace(/\\/g, "/");
      refs.push({ doc, line: lineOf(match.index), path: normalized });
    }
  }
  return refs;
}

function isPresent(path: string): boolean {
  return existsSync(resolve(ROOT, path));
}

describe("guidance documents cite real paths", () => {
  const refs = collectRefs();

  it("scans enough references for the check to mean something", () => {
    expect(refs.length).toBeGreaterThan(120);
    const docsSeen = new Set(refs.map((r) => r.doc));
    expect(docsSeen.size).toBe(GUIDANCE_DOCS.length);
  });

  it("names no file that has been deleted or misnamed", () => {
    const dead = refs
      .filter((r) => !isPresent(r.path) && !(r.path in KNOWN_ABSENT))
      .map((r) => `${r.doc}:${r.line} -> ${r.path}`);
    expect(dead).toEqual([]);
  });

  it("keeps every documented absence actually absent", () => {
    const resurrected = Object.entries(KNOWN_ABSENT)
      .filter(([path]) => isPresent(path))
      .map(([path, reason]) => `${path} exists again; the prose that cites it says "${reason}"`);
    expect(resurrected).toEqual([]);
  });
});
