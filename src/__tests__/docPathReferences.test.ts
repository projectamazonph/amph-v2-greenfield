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
 * now. That is two tiers, both taken from `docs/README.md`'s own "Current sources
 * of truth" table: `GUIDANCE_DOCS`, which describe the repository itself, and
 * `REFERENCE_DOCS`, which describe one subsystem of it. `CHANGELOG.md`,
 * `docs/stories/*`, `docs/sprint-plan.md`, `docs/SHIPPED-AND-REMAINING.md`,
 * `SESSION-HANDOVER.md`'s dated entries and the audit write-ups are retained
 * history, so a path that has since moved inside them is correct as written and is
 * not failed here.
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

/**
 * The second tier, taken from `docs/README.md`'s own "Current sources of truth"
 * table: these documents make present-tense claims about where code lives and
 * what it does, so a stale path in them sends a reader looking for a file that
 * is not there. `docs/sprint-plan.md` and `docs/SHIPPED-AND-REMAINING.md` are on
 * that page under delivery history and stay out for the same reason the stories
 * do. Three files in the table cite no repository path at all and were measured
 * as empty on 2026-09-23 (`docs/product-brief.md`, `docs/voice-guide.md`,
 * `docs/DISASTER-RECOVERY-RUNBOOK.md`), so scanning them would change nothing.
 */
const REFERENCE_DOCS = [
  "docs/api-reference.md",
  "docs/admin-backend.md",
  "docs/business-layer.md",
  "docs/db-schema.md",
  "docs/build-spec.md",
  "docs/decisions.md",
  "docs/design-brief.md",
  "docs/LEARNING-EXPERIENCE-8.5-BUILD-PLAN.md",
  "docs/runbooks/admin-access-recovery.md",
  "docs/runbooks/db-backup-restore.md",
  "docs/runbooks/learning-release-gate.md",
  "docs/runbooks/paymongo-outage.md",
  "docs/runbooks/simulator-scenario-missing.md",
  "docs/runbooks/webhook-replay.md",
];

const SCANNED_DOCS = [...GUIDANCE_DOCS, ...REFERENCE_DOCS];

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
    "removed on 2026-09-14 by e1f7352; CLAUDE.md and docs/db-schema.md cite it as the source of the pre-Sprint-14 findings and say it is gone",
  "docs/audit-2026-07-26-hardening-review.md":
    "removed on 2026-09-14 by e1f7352; the paymongo and admin-access runbooks cite it as the review that first recorded those gaps and say it is gone",
  "src/composition/requestContainer.ts":
    "never built as a separate file; ADR-017 and docs/build-spec.md now carry as-built notes saying the AsyncLocalStorage scope lives in container.ts",
  "src/domain/simulators/Simulator.ts":
    "wrong directory and wrong layer; ADR-019's as-built note names the real port at src/ports/simulator/Simulator.ts",
  "src/middleware.ts":
    "renamed by Next.js 16; docs/build-spec.md's as-built note points at src/proxy.ts",
  "src/infra/pricing/EarlyBirdPricingService.ts":
    "never committed here; docs/business-layer.md names it only to record that the count-based early-bird rule it describes was never built",
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
  for (const doc of SCANNED_DOCS) {
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
    expect(refs.length).toBeGreaterThan(200);
    const docsSeen = new Set(refs.map((r) => r.doc));
    expect(docsSeen.size).toBe(SCANNED_DOCS.length);
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

  it("only exempts a path some document still cites", () => {
    // Otherwise the exemption list becomes its own kind of stale reference: a
    // reason attached to a sentence that no longer exists anywhere.
    const cited = new Set(refs.map((r) => r.path));
    const unused = Object.keys(KNOWN_ABSENT).filter((path) => !cited.has(path));
    expect(unused).toEqual([]);
  });
});
