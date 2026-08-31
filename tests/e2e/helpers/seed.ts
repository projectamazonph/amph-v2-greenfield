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

/**
 * Shared connection helper for the seeding functions below — same
 * driver-adapter pattern as clearE2EUsers() (Prisma 7 needs an
 * adapter; a bare `new PrismaClient()` throws regardless of
 * DATABASE_URL). Returns `null` (with a console.warn) instead of
 * throwing so callers can no-op gracefully, matching clearE2EUsers's
 * robustness contract.
 */
async function connectForSeed(
  databaseUrl: string,
  label: string,
): Promise<{
  prisma: import("@prisma/client").PrismaClient;
  pool: import("pg").Pool;
} | null> {
  if (!databaseUrl) {
    // eslint-disable-next-line no-console
    console.warn(`[${label}] DATABASE_URL is empty; skipping.`);
    return null;
  }
  try {
    const { PrismaClient } = await import("@prisma/client");
    const { PrismaPg } = await import("@prisma/adapter-pg");
    const { Pool } = await import("pg");
    const pool = new Pool({
      connectionString: databaseUrl,
      connectionTimeoutMillis: 5000,
      query_timeout: 5000,
      statement_timeout: 5000,
    });
    const adapter = new PrismaPg(pool);
    const prisma = new PrismaClient({ adapter });
    return { prisma, pool };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(`[${label}] connection failed:`, err);
    return null;
  }
}

async function disconnect(
  conn: { prisma: import("@prisma/client").PrismaClient; pool: import("pg").Pool } | null,
): Promise<void> {
  if (!conn) return;
  try {
    await conn.prisma.$disconnect();
  } catch {
    // ignore
  }
  try {
    await conn.pool.end();
  } catch {
    // ignore
  }
}

/**
 * Seed (or promote) an ADMIN user directly via Prisma, bypassing
 * UserRepository.create() (hardcodes role: "STUDENT") — same
 * rationale and Argon2 params as scripts/seed-admin-user.mjs, so the
 * result is a login-compatible hash. Idempotent: re-running against
 * the same email just promotes/updates the password.
 *
 * Returns the plaintext credentials the E2E spec should submit
 * through the /admin-login form.
 */
export async function seedAdminUser(
  databaseUrl: string,
  overrides: { email?: string; password?: string } = {},
): Promise<{ email: string; password: string } | null> {
  const email = overrides.email ?? `e2e-admin-${Date.now()}@example.com`;
  const password = overrides.password ?? "AdminStr0ngP@ss!";

  const conn = await connectForSeed(databaseUrl, "seedAdminUser");
  if (!conn) return null;
  try {
    // argon2 is CJS-only — createRequire matches the interop trick
    // used by src/infra/security/Argon2PasswordHasher.ts and
    // scripts/seed-admin-user.mjs (both of which this helper mirrors).
    const { createRequire } = await import("node:module");
    const require = createRequire(import.meta.url);
    const argon2 = require("argon2") as typeof import("argon2");
    const passwordHash = await argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 65_536,
      timeCost: 3,
      parallelism: 1,
    });
    await conn.prisma.user.upsert({
      where: { email },
      create: {
        id: `e2e-admin-${Date.now()}`,
        email,
        password: passwordHash,
        firstName: "E2E",
        lastName: "Admin",
        role: "ADMIN",
        verificationStatus: "VERIFIED",
        twoFactorEnabled: true,
      },
      update: {
        password: passwordHash,
        role: "ADMIN",
        verificationStatus: "VERIFIED",
        twoFactorEnabled: true,
      },
    });
    return { email, password };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("[seedAdminUser] failed (non-fatal):", err);
    return null;
  } finally {
    await disconnect(conn);
  }
}

/** Seed the student and published course used by the admin access journey. */
export async function seedAdminAccessScenario(
  databaseUrl: string,
): Promise<{ studentId: string; studentName: string; courseTitle: string } | null> {
  const conn = await connectForSeed(databaseUrl, "seedAdminAccessScenario");
  if (!conn) return null;
  try {
    const suffix = Date.now();
    const student = await conn.prisma.user.create({
      data: {
        id: `e2e-access-student-${suffix}`,
        email: `e2e-access-student-${suffix}@example.com`,
        password: "unused-in-this-journey",
        firstName: "Ana",
        lastName: `Santos${suffix}`,
        verificationStatus: "VERIFIED",
      },
    });
    const course = await conn.prisma.course.create({
      data: {
        id: `e2e-access-course-${suffix}`,
        slug: `e2e-access-course-${suffix}`,
        title: `E2E Access Course ${suffix}`,
        tagline: "Seeded for admin access management",
        description: "Seeded for admin access management.",
        priceMinor: 299900,
        curriculum: {
          sections: [
            {
              id: "module-1",
              title: "Module 1",
              lessons: [{ id: "lesson-1", title: "Lesson 1", type: "TEXT", content: "" }],
            },
          ],
        },
        isPublished: true,
      },
    });
    return {
      studentId: student.id,
      studentName: `${student.firstName} ${student.lastName}`,
      courseTitle: course.title,
    };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("[seedAdminAccessScenario] failed (non-fatal):", err);
    return null;
  } finally {
    await disconnect(conn);
  }
}

/**
 * Seed a user + a PUBLISHED course + an issued Certificate for that
 * (user, course) pair, directly via Prisma — certificates are issued
 * programmatically (course completion), not through any admin UI, so
 * there's nothing to drive through the browser for setup. Returns the
 * data the certificate verification page (/certificates/[hash]) is
 * expected to render.
 */
export async function seedCertificate(
  databaseUrl: string,
): Promise<{ verificationHash: string; fullName: string; courseTitle: string } | null> {
  const conn = await connectForSeed(databaseUrl, "seedCertificate");
  if (!conn) return null;
  try {
    const suffix = Date.now();
    // VerifyCertificate.ts rejects anything not matching /^[0-9a-f]{64}$/
    // before even touching the DB (invalid_hash_format) — the hash has
    // to be a real 64-char hex string, not just any unique string.
    const { randomBytes } = await import("node:crypto");
    const verificationHash = randomBytes(32).toString("hex");
    const user = await conn.prisma.user.create({
      data: {
        id: `e2e-cert-user-${suffix}`,
        email: `e2e-cert-${suffix}@example.com`,
        password: "unused-in-this-journey",
        firstName: "Maria",
        lastName: `Santos${suffix}`,
        verificationStatus: "VERIFIED",
      },
    });
    const instructor = await conn.prisma.user.create({
      data: {
        id: `e2e-cert-instr-${suffix}`,
        email: `e2e-cert-instr-${suffix}@example.com`,
        password: "unused-in-this-journey",
        firstName: "Instructor",
        lastName: `${suffix}`,
        role: "INSTRUCTOR",
      },
    });
    const course = await conn.prisma.course.create({
      data: {
        id: `e2e-cert-course-${suffix}`,
        slug: `e2e-cert-course-${suffix}`,
        title: `E2E Certificate Course ${suffix}`,
        tagline: "Seeded for E2E certificate verification",
        description: "Seeded for E2E certificate verification.",
        priceMinor: 0,
        curriculum: { sections: [] },
        isPublished: true,
      },
    });
    const certificate = await conn.prisma.certificate.create({
      data: {
        id: `e2e-cert-${suffix}`,
        userId: user.id,
        courseId: course.id,
        verificationHash,
        status: "active",
      },
    });
    void instructor;
    return {
      verificationHash: certificate.verificationHash,
      fullName: `${user.firstName} ${user.lastName}`,
      courseTitle: course.title,
    };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("[seedCertificate] failed (non-fatal):", err);
    return null;
  } finally {
    await disconnect(conn);
  }
}

/**
 * Delete every row this file's seed helpers can create. Scoped by the
 * same "@example.com" email convention clearE2EUsers() uses, plus the
 * "e2e-" id/slug prefix for courses (which aren't caught by an email
 * filter). Safe to call even if nothing was seeded this run.
 */
export async function clearE2ESeedData(databaseUrl: string): Promise<void> {
  const conn = await connectForSeed(databaseUrl, "clearE2ESeedData");
  if (!conn) return;
  try {
    // Certificates cascade-delete when their user is deleted (onDelete:
    // Cascade on Certificate.user), so deleting users first is enough
    // for that table. Courses have no such cascade from User, so they
    // need an explicit delete, scoped to the "e2e-" id prefix this
    // file always uses for seeded courses.
    await conn.prisma.user.deleteMany({ where: { email: { contains: "@example.com" } } });
    await conn.prisma.course.deleteMany({ where: { id: { startsWith: "e2e-" } } });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("[clearE2ESeedData] cleanup failed (non-fatal):", err);
  } finally {
    await disconnect(conn);
  }
}

export async function clearE2EUsers(databaseUrl: string): Promise<void> {
  if (!databaseUrl) {
    // eslint-disable-next-line no-console
    console.warn("[clearE2EUsers] DATABASE_URL is empty; skipping cleanup.");
    return;
  }
  // Only mutate process.env.DATABASE_URL when we have a real value.
  process.env.DATABASE_URL = databaseUrl;
  let prisma: import("@prisma/client").PrismaClient | undefined;
  let pool: import("pg").Pool | undefined;
  try {
    const { PrismaClient } = await import("@prisma/client");
    const { PrismaPg } = await import("@prisma/adapter-pg");
    const { Pool } = await import("pg");
    // Finite timeouts so an unreachable/misconfigured DB fails fast into
    // the catch below instead of hanging the caller's afterEach.
    pool = new Pool({
      connectionString: databaseUrl,
      connectionTimeoutMillis: 5000,
      query_timeout: 5000,
      statement_timeout: 5000,
    });
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
    // PrismaPg does not close an externally supplied pool on
    // $disconnect() by default; close it ourselves so repeated afterEach
    // calls don't pile up idle connections.
    if (pool) {
      try {
        await pool.end();
      } catch {
        // ignore pool shutdown errors
      }
    }
  }
}
