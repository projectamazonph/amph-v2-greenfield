/**
 * route.guard.test.ts — SOLID regression guard for the PayMongo
 * webhook route.
 *
 * The route was previously using `new InMemory*()` directly for
 * order/course/user/enrollment repos. This is the "in-memory in
 * production" anti-pattern — webhook-driven enrollments would never
 * persist, and the order lookups would always 404.
 *
 * The fix: use buildContainer() (the composition root).
 *
 * What we test:
 *  - The route's source does NOT instantiate InMemory* adapters
 *    directly
 *  - The route DOES use buildContainer() + container.enrollStudent
 *
 * Pure-handler behavior is covered in route.test.ts. The container
 * wiring is covered in src/composition/__tests__/container.test.ts.
 * This file is the regression guard against the broken pattern.
 *
 * TDD: this is the minimum test that locks in the bug fix.
 */

import { describe, it, expect } from "vitest";
import * as fs from "node:fs/promises";
import * as path from "node:path";

describe("/api/webhooks/paymongo — SOLID regression guard", () => {
  it("does NOT instantiate InMemory* adapters directly in the route", async () => {
    const routePath = path.resolve(
      process.cwd(),
      "src/app/api/webhooks/paymongo/route.ts",
    );
    const source = await fs.readFile(routePath, "utf8");
    // No direct instantiation
    expect(source).not.toMatch(/new\s+InMemoryOrderRepository/);
    expect(source).not.toMatch(/new\s+InMemoryCourseRepository/);
    expect(source).not.toMatch(/new\s+InMemoryUserRepository/);
    expect(source).not.toMatch(/new\s+InMemoryEnrollmentRepository/);
    // No direct imports of these adapters
    expect(source).not.toMatch(/from\s+["']@\/infra\/payment\/InMemoryOrderRepository/);
    expect(source).not.toMatch(/from\s+["']@\/infra\/repositories\/InMemoryCourseRepository/);
    expect(source).not.toMatch(/from\s+["']@\/infra\/repositories\/InMemoryUserRepository/);
    expect(source).not.toMatch(/from\s+["']@\/infra\/repositories\/InMemoryEnrollmentRepository/);
  });

  it("DOES use buildContainer() for the data layer", async () => {
    const routePath = path.resolve(
      process.cwd(),
      "src/app/api/webhooks/paymongo/route.ts",
    );
    const source = await fs.readFile(routePath, "utf8");
    expect(source).toMatch(/buildContainer/);
  });
});
