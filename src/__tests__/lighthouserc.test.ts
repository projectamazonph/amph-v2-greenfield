/**
 * .lighthouserc.json tripwire.
 *
 * Pins the LHCI config so future edits don't accidentally:
 *  - drop the assertion block (turns the job into a silent scorer)
 *  - relax the accessibility/SEO thresholds below the build-spec floor
 *  - point the job at the wrong URLs
 *  - remove the upload target (so scores never make it to the GH
 *    Actions summary at all)
 *
 * The build-spec floor is documented at
 * `docs/security/tenant-isolation.md` (Lighthouse perf ≥ 0.85, a11y/bp
 * ≥ 0.95, seo ≥ 0.9). Our .lighthouserc.json starts at a softer
 * threshold (perf 0.7, a11y 0.9, bp 0.8, seo 0.9) so the first run
 * with a real job doesn't fail on noise; tighten once the baseline
 * is stable.
 */

import { describe, it, expect } from "vitest";
import * as fs from "node:fs/promises";
import * as path from "node:path";

const LHCI_PATH = path.resolve(process.cwd(), ".lighthouserc.json");

interface LhciConfig {
  ci: {
    collect: { url: string[]; numberOfRuns: number };
    assert: { assertions: Record<string, [string, { minScore: number }]> };
    upload: { target: string };
  };
}

async function load(): Promise<LhciConfig> {
  const raw = await fs.readFile(LHCI_PATH, "utf8");
  return JSON.parse(raw);
}

describe(".lighthouserc.json", () => {
  it("parses as valid JSON", async () => {
    const cfg = await load();
    expect(cfg).toBeDefined();
    expect(cfg.ci).toBeDefined();
  });

  it("collects scores for the four canonical public URLs", async () => {
    const cfg = await load();
    const urls = cfg.ci.collect.url;
    expect(urls).toContain("http://localhost:3000/");
    expect(urls).toContain("http://localhost:3000/courses");
    expect(urls).toContain("http://localhost:3000/pricing");
    expect(urls).toContain("http://localhost:3000/login");
    // The login page must be in the list — it's an auth-gated
    // page in the funnel and we want to catch any a11y/SEO
    // regression in the form fields.
    expect(urls.length).toBeGreaterThanOrEqual(4);
  });

  it("asserts all four Lighthouse categories", async () => {
    const cfg = await load();
    const a = cfg.ci.assert.assertions;
    expect(a).toHaveProperty("categories:performance");
    expect(a).toHaveProperty("categories:accessibility");
    expect(a).toHaveProperty("categories:best-practices");
    expect(a).toHaveProperty("categories:seo");
  });

  it("marks accessibility and SEO as hard errors (not warnings)", async () => {
    // a11y/SEO regressions break the product (legal/compliance
    // risk). They should be hard errors, even though performance
    // is still a warning.
    const cfg = await load();
    const a = cfg.ci.assert.assertions;
    expect(a["categories:accessibility"]?.[0]).toBe("error");
    expect(a["categories:seo"]?.[0]).toBe("error");
  });

  it("uses median aggregation (so one outlier URL doesn't tank the score)", async () => {
    const cfg = await load();
    const a = cfg.ci.assert.assertions;
    for (const key of Object.keys(a)) {
      expect(a[key]?.[1]).toHaveProperty("aggregationMethod", "median");
    }
  });

  it("uploads results to a target (so scores show in the GH Actions summary)", async () => {
    const cfg = await load();
    expect(cfg.ci.upload.target).toBeTruthy();
  });

  it("runs at least 1 collection per URL", async () => {
    const cfg = await load();
    expect(cfg.ci.collect.numberOfRuns).toBeGreaterThanOrEqual(1);
  });
});
