/**
 * P0-4: post-auth destination regression guard.
 *
 * Audit bullet: "Successful users land on 404" because the public
 * auth flow (signup) redirected to /dashboard which didn't exist.
 *
 * This test asserts that the /dashboard route file exists and is
 * reachable as a Next.js page module. If someone deletes the page,
 * this test fails before the build does.
 */

import { describe, it, expect } from "vitest";
import * as fs from "node:fs/promises";
import * as path from "node:path";

describe("P0-4: /dashboard route exists", () => {
  it("src/app/dashboard/page.tsx exists", async () => {
    const p = path.resolve(process.cwd(), "src/app/dashboard/page.tsx");
    const exists = await fs.stat(p).then(() => true).catch(() => false);
    expect(exists).toBe(true);
  });

  it("src/app/dashboard/page.tsx exports a default async function", async () => {
    const p = path.resolve(process.cwd(), "src/app/dashboard/page.tsx");
    const source = await fs.readFile(p, "utf8");
    expect(source).toMatch(/export\s+default\s+async\s+function\s+DashboardPage/);
  });

  it("dashboard page is auth-gated (uses getSessionUser)", async () => {
    const p = path.resolve(process.cwd(), "src/app/dashboard/page.tsx");
    const source = await fs.readFile(p, "utf8");
    expect(source).toMatch(/getSessionUser/);
  });

  it("dashboard page is registered as a protected route in proxy", async () => {
    const p = path.resolve(process.cwd(), "src/proxy.ts");
    const source = await fs.readFile(p, "utf8");
    // The protected prefixes list must include /dashboard so unauthed
    // users are bounced to /login.
    expect(source).toMatch(/["']\/dashboard["']/);
  });
});
