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
 * We also pin the PNG icons referenced explicitly by
 * `metadata.icons` in `src/app/layout.tsx` (favicon-32,
 * icon-512, apple-touch-icon) so those can't silently disappear
 * either — there is no `src/app/icon.*` file convention in use
 * since the brand mark logo is a raster asset.
 */

import { describe, it, expect } from "vitest";
import * as fs from "node:fs/promises";
import * as path from "node:path";

const FAVICON = path.resolve(process.cwd(), "src/app/favicon.ico");
const PUBLIC_ICONS = [
  "public/favicon-32.png",
  "public/icon-512.png",
  "public/apple-touch-icon.png",
].map((p) => path.resolve(process.cwd(), p));

describe("favicon metadata", () => {
  it("has a favicon.ico at src/app/favicon.ico", async () => {
    const stat = await fs.stat(FAVICON);
    expect(stat.isFile()).toBe(true);
    expect(stat.size).toBeGreaterThan(0);
  });

  it.each(PUBLIC_ICONS)("has a referenced icon at %s", async (iconPath) => {
    const stat = await fs.stat(iconPath);
    expect(stat.isFile()).toBe(true);
    expect(stat.size).toBeGreaterThan(0);
  });
});
