/**
 * Round 32 — C-07 contract pin: every Skeleton variant declares
 * `aria-busy="true"` + `role="status"` + `aria-live="polite"` so screen
 * readers announce the loading state.
 *
 * Audit bullet C-07 (docs/UI-ACCESSIBILITY-AUDIT-2026-08-14.md lines 90-95):
 *   "Skeleton region lacks `aria-busy`.
 *    Each `SkeletonBlock` is `aria-hidden="true"` (correct — decorative),
 *    but the parent region that is *actually* loading (`<SkeletonTable>`,
 *    `<SkeletonCard>`, etc.) never carries `aria-busy=\"true\"` and never
 *    has a parent set to live region status. Screen reader users hear
 *    nothing while the page loads.
 *    Fix: Add `role=\"status\"` and `aria-busy=\"true\"` (or
 *    `aria-live=\"polite\"`) to the wrapper divs in `SkeletonCard`,
 *    `SkeletonTable`, and `SkeletonForm`."
 *
 * The C-07 fix added the three accessibility attributes to every Skeleton
 * variant (`SkeletonText`, `SkeletonRow`, `SkeletonCard`, `SkeletonTable`,
 * `SkeletonStatTile`, `SkeletonForm`). The block primitives keep
 * `aria-hidden="true"` because they are decorative.
 *
 * WCAG 4.1.3 *Status Messages*.
 *
 * Mirrors the source-string pattern from rounds 16-31.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const SKELETON = "src/components/ui/Skeleton.tsx";

function readSkeleton(): string {
  return readFileSync(resolve(process.cwd(), SKELETON), "utf8");
}

/**
 * Extract a single variant function body. Anchors on `export function NAME`
 * and ends at the next `\nexport function ` (the start of the next variant)
 * or at EOF. This avoids the lazy `\}\s*\n` match that snaps at the first
 * JSX-attribute close brace instead of the function close brace.
 */
function variantBody(src: string, name: string): string {
  const re = new RegExp(`export function ${name}\\b[\\s\\S]*?(?=\\nexport function |$)`);
  return src.match(re)?.[0] ?? "";
}

function containerCount(src: string): number {
  // Each variant wrapper declares `aria-busy="true"` exactly once.
  const matches = src.match(/aria-busy="true"/g) ?? [];
  return matches.length;
}

describe("M-R32: Skeleton variants carry aria-busy + role=status (WCAG 4.1.3)", () => {
  it("SkeletonText carries aria-busy + role=status + aria-live", () => {
    const src = readSkeleton();
    // SkeletonText wraps its blocks in a div with the three attrs.
    const textBlock = variantBody(src, "SkeletonText");
    expect(textBlock).toMatch(/aria-busy="true"/);
    expect(textBlock).toMatch(/role="status"/);
    expect(textBlock).toMatch(/aria-live="polite"/);
  });

  it("SkeletonRow carries aria-busy + role=status + aria-live", () => {
    const src = readSkeleton();
    const rowBlock = variantBody(src, "SkeletonRow");
    expect(rowBlock).toMatch(/aria-busy="true"/);
    expect(rowBlock).toMatch(/role="status"/);
    expect(rowBlock).toMatch(/aria-live="polite"/);
  });

  it("SkeletonCard carries aria-busy + role=status + aria-live", () => {
    const src = readSkeleton();
    const cardBlock = variantBody(src, "SkeletonCard");
    expect(cardBlock).toMatch(/aria-busy="true"/);
    expect(cardBlock).toMatch(/role="status"/);
    expect(cardBlock).toMatch(/aria-live="polite"/);
  });

  it("SkeletonTable carries aria-busy + role=status + aria-live", () => {
    const src = readSkeleton();
    const tableBlock = variantBody(src, "SkeletonTable");
    expect(tableBlock).toMatch(/aria-busy="true"/);
    expect(tableBlock).toMatch(/role="status"/);
    expect(tableBlock).toMatch(/aria-live="polite"/);
  });

  it("SkeletonStatTile carries aria-busy + role=status + aria-live", () => {
    const src = readSkeleton();
    const statBlock = variantBody(src, "SkeletonStatTile");
    expect(statBlock).toMatch(/aria-busy="true"/);
    expect(statBlock).toMatch(/role="status"/);
    expect(statBlock).toMatch(/aria-live="polite"/);
  });

  it("SkeletonForm carries aria-busy + role=status + aria-live", () => {
    const src = readSkeleton();
    const formBlock = variantBody(src, "SkeletonForm");
    expect(formBlock).toMatch(/aria-busy="true"/);
    expect(formBlock).toMatch(/role="status"/);
    expect(formBlock).toMatch(/aria-live="polite"/);
  });

  it("SkeletonBlock remains aria-hidden (decorative primitive)", () => {
    const src = readSkeleton();
    const blockDef = variantBody(src, "SkeletonBlock");
    // Block is decorative — should NOT carry aria-busy (the wrapper does).
    expect(blockDef).toMatch(/aria-hidden="true"/);
    expect(blockDef).not.toMatch(/aria-busy="true"/);
  });

  it("aria-busy count matches the number of variant wrappers (6 variants)", () => {
    const src = readSkeleton();
    // 6 wrappers: Text, Row, Card, Table, StatTile, Form.
    expect(containerCount(src)).toBe(6);
  });
});