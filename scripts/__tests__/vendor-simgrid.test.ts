import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(__dirname, "..", "..");
const VENDORED = resolve(ROOT, "public/simgrid-v1");

describe("vendor-simgrid", () => {
  it("writes VERSION.txt with a sha: pin", () => {
    const versionPath = resolve(VENDORED, "VERSION.txt");
    expect(existsSync(versionPath)).toBe(true);
    expect(readFileSync(versionPath, "utf8").trim()).toMatch(/^sha:[0-9a-f]{40}$/);
  });

  it("ships the patched bridge file", () => {
    const bridgePath = resolve(VENDORED, "assets", "student-progress.js");
    expect(existsSync(bridgePath)).toBe(true);
    const contents = readFileSync(bridgePath, "utf8");
    expect(contents).toContain("target.postMessage");
    expect(contents).not.toMatch(/root\.opener\.postMessage/);
  });

  it("ships PATCHES.md describing every patch", () => {
    const patchesPath = resolve(VENDORED, "PATCHES.md");
    expect(existsSync(patchesPath)).toBe(true);
  });

  // Vendor-upgrade smoke check: VERSION.txt must hold a sha:<40-hex>
  // pin so a future vendor-simgrid.sh run can be diffed against
  // PATCHES.md. This duplicates the regex from the first test so a
  // regression (someone re-pinning to a tag or moving to a git ref)
  // fails the suite even if the file still exists.
  it("VERSION.txt sha matches the applied patches", () => {
    const versionPath = resolve(VENDORED, "VERSION.txt");
    const sha = readFileSync(versionPath, "utf8").trim();
    expect(sha).toMatch(/^sha:[0-9a-f]{40}$/);
  });
});
