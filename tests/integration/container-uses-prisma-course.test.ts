/**
 * Regression guard: the production container must wire Prisma for
 * the course repo, not InMemory.
 *
 * P0-2 audit bullet: "Production state is mostly process-local" —
 * courseRepo was the most user-visible (catalog vanished on restart).
 * This test prevents a future refactor from accidentally reverting
 * the wiring.
 */

import { describe, it, expect } from "vitest";
import * as fs from "node:fs/promises";
import * as path from "node:path";

describe("P0-2: production container uses PrismaCourseRepository", () => {
  it("src/composition/container.ts imports PrismaCourseRepository", async () => {
    const p = path.resolve(process.cwd(), "src/composition/container.ts");
    const source = await fs.readFile(p, "utf8");
    expect(source).toMatch(/import\s+\{\s*PrismaCourseRepository\s*\}\s+from\s+["']@\/infra\/repositories\/PrismaCourseRepository["']/);
  });

  it("container wires courseRepo with PrismaCourseRepository (not InMemoryCourseRepository)", async () => {
    const p = path.resolve(process.cwd(), "src/composition/container.ts");
    const source = await fs.readFile(p, "utf8");
    expect(source).toMatch(/courseRepo:\s*CourseRepository\s*=\s*new\s+PrismaCourseRepository\(/);
    // The old wiring should be gone.
    expect(source).not.toMatch(/courseRepo:\s*CourseRepository\s*=\s*new\s+InMemoryCourseRepository\(/);
  });

  it("PrismaCourseRepository file exists and exports the class", async () => {
    const p = path.resolve(process.cwd(), "src/infra/repositories/PrismaCourseRepository.ts");
    const source = await fs.readFile(p, "utf8");
    expect(source).toMatch(/export\s+class\s+PrismaCourseRepository/);
  });
});
