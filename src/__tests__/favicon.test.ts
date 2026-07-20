/**
 * Favicon tripwire.
 *
 * Next.js's standalone server reads static files from
 * `.next/standalone/public/` (not from the project root). For
 * `/favicon.ico` to 200 in production, the `app/favicon.ico`
 * file must exist (Next.js's metadata convention copies it
 * into the standalone bundle at build time).
 *
 * The first tightened LHCI run (PR #123) failed every URL with
 * `errors-in-console` because `/favicon.ico` 404'd. This test
 * pins the file's existence so the favicon can't silently
 * disappear in a future refactor.
 *
 * We also pin `app/icon.svg` (Next.js 16 generates `<link
 * rel="icon" href="/icon">` from it) so the SVG variant
 * doesn't regress either.
 */

import { describe, it, expect } from "vitest";
import * as fs from "node:fs/promises";
import * as path from "node:path";

const FAVICON = path.resolve(process.cwd(), "src/app/favicon.ico");
const ICON_SVG = path.resolve(process.cwd(), "src/app/icon.svg");

describe("favicon metadata", () => {
  it("has a favicon.ico at src/app/favicon.ico", async () => {
    const stat = await fs.stat(FAVICON);
    expect(stat.isFile()).toBe(true);
    expect(stat.size).toBeGreaterThan(0);
  });

  it("has an icon.svg at src/app/icon.svg (Next 16 metadata convention)", async () => {
    const stat = await fs.stat(ICON_SVG);
    expect(stat.isFile()).toBe(true);
    expect(stat.size).toBeGreaterThan(0);
  });
});
