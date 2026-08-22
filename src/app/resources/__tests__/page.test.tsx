import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("/resources student download center", () => {
  const source = readFileSync(resolve(__dirname, "../page.tsx"), "utf8");
  const css = readFileSync(resolve(__dirname, "../page.module.css"), "utf8");

  it("exposes a clear resource summary and category counts", () => {
    expect(source).toContain("Student resources");
    expect(source).toContain("resources available");
    expect(source).toContain("sectionCount");
    expect(source).toContain("aria-labelledby={`${category}-heading`}");
  });

  it("keeps download and upgrade actions explicit", () => {
    expect(source).toContain("Download");
    expect(source).toContain("Upgrade");
    expect(source).toContain("DownloadSimple");
    expect(source).toContain("LockKey");
  });

  it("provides action-oriented error and empty states", () => {
    expect(source).toContain("Return to dashboard");
    expect(source).toContain("Continue learning");
  });

  it("uses a responsive resource row layout", () => {
    expect(css).toMatch(/@media\s*\(max-width:\s*767px\)/);
    expect(css).toMatch(/\.row\s*\{[\s\S]*?grid-template-columns:/);
    expect(css).toContain(".resourceIcon");
  });
});
