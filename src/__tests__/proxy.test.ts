/**
 * Proxy tests — locks in the "do not redirect /" behavior.
 *
 * The proxy (`src/proxy.ts`) is Next 16's request-time handler. It
 * runs on every request before the page or API route, attaches
 * security headers, and redirects unauthenticated users away from
 * protected routes (/dashboard, /admin, /enroll, /order).
 *
 * The original proxy also redirected `/` to `/signup` for any
 * visitor, which was a placeholder from the greenfield bootstrap
 * and predated the marketing landing page (PR #110). After the
 * landing page shipped, the redirect made the page unreachable
 * and broke Lighthouse. This test pins the corrected behavior so
 * the redirect doesn't sneak back in.
 *
 * We don't import `proxy` directly (it has Next.js runtime
 * dependencies); instead we assert the behavior via grep on the
 * source — a coarse but effective tripwire. A future refactor
 * that re-adds the redirect will fail this test.
 */

import { describe, it, expect } from "vitest";
import * as fs from "node:fs/promises";
import * as path from "node:path";

const PROXY_PATH = path.resolve(
  process.cwd(),
  "src/proxy.ts",
);

describe("proxy (src/proxy.ts)", () => {
  it("does NOT redirect / to /signup", async () => {
    const source = await fs.readFile(PROXY_PATH, "utf8");
    // The original redirect looked like:
    //   if (pathname === "/") {
    //     return NextResponse.redirect(new URL("/signup", request.url));
    //   }
    // Assert the redirect block is gone.
    expect(source).not.toMatch(/pathname\s*===\s*["']\/["']/);
    expect(source).not.toMatch(/new URL\(["']\/signup["']/);
  });

  it("still protects /dashboard, /admin, /enroll, /order from unauthenticated users", async () => {
    const source = await fs.readFile(PROXY_PATH, "utf8");
    // The proxy should still list these prefixes as protected.
    expect(source).toMatch(/\/dashboard/);
    expect(source).toMatch(/\/admin/);
    expect(source).toMatch(/\/enroll/);
    expect(source).toMatch(/\/order/);
  });

  it("attaches the standard security headers on every response", async () => {
    const source = await fs.readFile(PROXY_PATH, "utf8");
    expect(source).toMatch(/X-Frame-Options/);
    expect(source).toMatch(/X-Content-Type-Options/);
    expect(source).toMatch(/Referrer-Policy/);
    expect(source).toMatch(/Permissions-Policy/);
  });

  it("has a comment explaining why / is not redirected", async () => {
    // The fix isn't enough on its own — without a comment explaining
    // WHY the redirect was removed, the next refactor is likely to
    // re-add it. This test pins the rationale.
    const source = await fs.readFile(PROXY_PATH, "utf8");
    const lower = source.toLowerCase();
    expect(lower).toContain("landing");
    expect(lower).toContain("unauthenticated");
  });
});
