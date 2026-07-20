/**
 * CI workflow tripwire — pins the standalone bundle contract.
 *
 * The lighthouse job (and any future deploy that uses the build
 * artifact) depends on the `build` job copying `.next/static`
 * and `public/` INTO `.next/standalone/` before uploading.
 *
 * Without that copy, the standalone `server.js` reads static
 * files from the wrong path and every CSS chunk, font, and
 * favicon 404s — surfacing as `errors-in-console` in Lighthouse
 * and as broken pages in production.
 *
 * This test is a cheap grep on the workflow YAML so future
 * refactors don't silently drop the copy step. The build
 * itself is tested in CI; this test just pins the contract.
 */

import { describe, it, expect } from "vitest";
import * as fs from "node:fs/promises";
import * as path from "node:path";

const CI_PATH = path.resolve(process.cwd(), ".github/workflows/ci.yml");

async function loadCI(): Promise<string> {
  return fs.readFile(CI_PATH, "utf8");
}

describe("ci.yml — standalone build contract", () => {
  it("copies .next/static into .next/standalone/.next/static", async () => {
    const ci = await loadCI();
    // The copy step must exist in the build job.
    // We don't pin the exact step name (a refactor may rename
    // it), just the key command.
    expect(ci).toMatch(/cp -r \.next\/static \.next\/standalone\/\.next\/static/);
  });

  it("ensures .next/standalone/public exists (or the repo's public/ is copied into it)", async () => {
    // The repo currently has no public/ dir, so the copy step
    // must be defensive: mkdir the target, then copy only if
    // public/ exists. The tripwire pins the defensive form.
    const ci = await loadCI();
    expect(ci).toMatch(/mkdir -p \.next\/standalone\/public/);
    expect(ci).toMatch(/if \[ -d public \]; then cp -r public\/\. \.next\/standalone\/public/);
  });

  it("uploads only .next/standalone (the bundled artifact)", async () => {
    // Once static + public are copied INTO the standalone bundle,
    // uploading them at the project root is redundant and risky
    // (the lighthouse job could pick the wrong path).
    const ci = await loadCI();
    // The build-job upload path block should be just the standalone dir.
    const uploadSection = ci.match(/name: build[\s\S]+?path: ([^\n]+)/);
    expect(uploadSection?.[1]?.trim()).toBe(".next/standalone");
  });

  it("starts the server from .next/standalone/server.js", async () => {
    const ci = await loadCI();
    expect(ci).toMatch(/node \.next\/standalone\/server\.js/);
  });

  it("waits for /api/health to return 200 before running lhci", async () => {
    // The lighthouse job needs the server to actually be up
    // before it starts collecting scores. Without this wait
    // step, the job races the server boot and 404s.
    const ci = await loadCI();
    expect(ci).toMatch(/localhost:3000\/api\/health/);
  });

  it("uses .lighthouserc.json (not inline flags)", async () => {
    // The previous configuration put 4 URLs + assertions inline
    // in the workflow YAML. After the tightening (#123) we
    // moved them to a versioned config file. If a future edit
    // re-introduces inline `--collect.url=` it will diverge
    // from the file.
    const ci = await loadCI();
    expect(ci).toMatch(/--config=\.\/\.lighthouserc\.json/);
    expect(ci).not.toMatch(/--collect\.staticDistDir/);
  });
});
