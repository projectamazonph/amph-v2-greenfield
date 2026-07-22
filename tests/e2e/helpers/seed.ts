/**
 * E2E seed helpers — STORY-055.
 *
 * These helpers talk directly to the test database so E2E specs can
 * set up state quickly without driving the UI for setup steps.
 *
 * Robustness contract (locked in by
 * tests/unit/e2e-helpers/clearE2EUsers.test.ts):
 *  - An empty databaseUrl MUST be a no-op (warn, not throw).
 *  - A malformed databaseUrl MUST be a no-op (warn, not throw).
 *  - The helper MUST never let a Prisma init error crash the
 *    caller's afterEach. The cleanup is best-effort.
 *  - Calling with an empty string MUST NOT clobber
 *    process.env.DATABASE_URL (in case a real value is set later).
 *
 * Why this matters: when the Playwright worker process did not
 * inherit DATABASE_URL, the original implementation threw
 * PrismaClientInitializationError, which caused afterEach to fail,
 * which made the entire critical-journeys suite red even when the
 * test bodies had passed.
 *
 * Prisma 7 note: `prisma/schema.prisma`'s datasource has no `url`,
 * connections are supplied via a driver adapter (see
 * `src/infra/database/prisma.ts`). A bare `new PrismaClient()` with
 * no adapter always throws PrismaClientInitializationError regardless
 * of DATABASE_URL, which silently no-op'd this cleanup on every run.
 */

export async function clearE2EUsers(databaseUrl: string): Promise<void> {
  if (!databaseUrl) {
    // eslint-disable-next-line no-console
    console.warn("[clearE2EUsers] DATABASE_URL is empty; skipping cleanup.");
    return;
  }
  // Only mutate process.env.DATABASE_URL when we have a real value.
  process.env.DATABASE_URL = databaseUrl;
  let prisma: import("@prisma/client").PrismaClient | undefined;
  try {
    const { PrismaClient } = await import("@prisma/client");
    const { PrismaPg } = await import("@prisma/adapter-pg");
    const { Pool } = await import("pg");
    const pool = new Pool({ connectionString: databaseUrl });
    const adapter = new PrismaPg(pool);
    prisma = new PrismaClient({ adapter });
    await prisma.user.deleteMany({
      where: { email: { contains: "@example.com" } },
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("[clearE2EUsers] cleanup failed (non-fatal):", err);
  } finally {
    if (prisma) {
      try {
        await prisma.$disconnect();
      } catch {
        // ignore disconnect errors
      }
    }
  }
}
