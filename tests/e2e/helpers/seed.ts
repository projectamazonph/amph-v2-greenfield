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
 * Counterpart to OtpauthTotpService.generateSecret() for the E2E seed
 * below — same library, same params (20-byte secret, base32). Kept as
 * a module-level function (not a method on the production service, which
 * has no "generate a code" API by design) so specs can mint the current
 * TOTP code for a seeded admin at submit time.
 */
export async function currentTotpCode(secret: string): Promise<string> {
  const { TOTP, Secret } = await import("otpauth");
  return new TOTP({
    secret: Secret.fromBase32(secret),
    algorithm: "SHA1",
    digits: 6,
    period: 30,
  }).generate();
}

/**
 * Seed (or promote) an ADMIN user directly via Prisma, bypassing
 * UserRepository.create() (hardcodes role: "STUDENT") — same
 * rationale and Argon2 params as scripts/seed-admin-user.mjs, so the
 * result is a login-compatible hash. Idempotent: re-running against
 * the same email just promotes/updates the password.
 *
 * 2FA is fully configured, not just flagged: the user gets a real
 * TOTP secret (same generation params as OtpauthTotpService) with
 * twoFactorEnabled=true, because requireAdmin() redirects admins
 * without 2FA to /admin/settings and Login returns totp_required
 * without a submitted code. Seeding the flag alone (the previous
 * behavior) made every admin-login journey bounce back to
 * /admin-login — and the journey's `toHaveURL(/\/admin/)` assertion
 * passed spuriously on the "/admin-login" substring, so the failure
 * surfaced 30s later as a missing-form timeout instead of at login.
 *
 * Returns the plaintext credentials plus the TOTP secret — the E2E
 * spec must submit `currentTotpCode(totpSecret)` in the form's
 * "Two-factor code" field alongside email + password.
 */
export async function seedAdminUser(
  databaseUrl: string,
  overrides: { email?: string; password?: string } = {},
): Promise<{ email: string; password: string; totpSecret: string } | null> {
  const email = overrides.email ?? `e2e-admin-${Date.now()}@example.com`;
  const password = overrides.password ?? "AdminStr0ngP@ss!";

  const conn = await connectForSeed(databaseUrl, "seedAdminUser");
  if (!conn) return null;
  let totpSecret: string;
  try {
    const { Secret } = await import("otpauth");
    totpSecret = new Secret({ size: 20 }).base32;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("[seedAdminUser] TOTP secret generation failed:", err);
    return null;
  }
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
        twoFactorSecret: totpSecret,
      },
      update: {
        password: passwordHash,
        role: "ADMIN",
        verificationStatus: "VERIFIED",
        twoFactorEnabled: true,
        twoFactorSecret: totpSecret,
      },
    });
    return { email, password, totpSecret };
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

/**
 * Seed a STUDENT user with an ACTIVE Enrollment on the foundations
 * course (slug: "foundations"), directly via Prisma. Returns the
 * user's id and email so the spec can authenticate as them via
 * session cookie. STORY-163 worksheet e2e depends on this; the
 * existing helper surface already returns null when DATABASE_URL
 * is empty, which lets the gated spec stay gated until the env is
 * wired.
 *
 * Idempotent on (email): re-running upserts the user and reuses
 * the existing Enrollment if the (userId, courseId) pair is
 * already present. clearE2EUsers() (called from afterEach) wipes
 * the user row by email-pattern so the cleanup story stays simple.
 *
 * Why a new helper instead of piggybacking on
 * seedAdminAccessScenario: that helper creates a course with a
 * timestamped slug, which doesn't match the lesson URL the spec
 * visits (`/courses/foundations/lessons/1.1-...`). The worksheet
 * e2e needs the real foundations course so the lesson page
 * exists in production.
 */
export async function seedStudentAndEnrollment(
  databaseUrl: string,
  overrides: { email?: string; password?: string; courseSlug?: string } = {},
): Promise<{
  studentId: string;
  email: string;
  password: string;
  courseSlug: string;
} | null> {
  const email = overrides.email ?? `e2e-student-${Date.now()}@example.com`;
  const password = overrides.password ?? "StudentStr0ngP@ss!";
  const courseSlug = overrides.courseSlug ?? "foundations";
  const conn = await connectForSeed(databaseUrl, "seedStudentAndEnrollment");
  if (!conn) return null;
  try {
    const { createRequire } = await import("node:module");
    const require = createRequire(import.meta.url);
    const argon2 = require("argon2") as typeof import("argon2");
    const passwordHash = await argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 65_536,
      timeCost: 3,
      parallelism: 1,
    });
    const student = await conn.prisma.user.upsert({
      where: { email },
      create: {
        id: `e2e-student-${Date.now()}`,
        email,
        password: passwordHash,
        firstName: "E2E",
        lastName: `Student${Date.now()}`,
        role: "STUDENT",
        verificationStatus: "VERIFIED",
        // Skip the welcome stepper so the lesson page is reachable
        // directly. Without this, the spec gets bounced from the
        // lesson page to /welcome by STORY-146.
        welcomeCompletedAt: new Date(),
      },
      update: {
        password: passwordHash,
        verificationStatus: "VERIFIED",
        welcomeCompletedAt: new Date(),
      },
    });
    const course = await conn.prisma.course.findUnique({
      where: { slug: courseSlug },
    });
    if (!course) {
      // eslint-disable-next-line no-console
      console.warn(
        `[seedStudentAndEnrollment] course slug "${courseSlug}" not found; run \`pnpm import:content\` first`,
      );
      return null;
    }
    await conn.prisma.enrollment.upsert({
      where: {
        userId_courseId: {
          userId: student.id,
          courseId: course.id,
        },
      },
      create: {
        userId: student.id,
        courseId: course.id,
        status: "active",
      },
      update: {
        status: "active",
      },
    });
    return { studentId: student.id, email, password, courseSlug };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("[seedStudentAndEnrollment] failed (non-fatal):", err);
    return null;
  } finally {
    await disconnect(conn);
  }
}

/** Clean up only the worksheet rows for a given student. Best-effort. */
export async function clearWorksheetEntries(databaseUrl: string, studentId: string): Promise<void> {
  if (!databaseUrl) return;
  process.env.DATABASE_URL = databaseUrl;
  let prisma: import("@prisma/client").PrismaClient | undefined;
  let pool: import("pg").Pool | undefined;
  try {
    const { PrismaClient } = await import("@prisma/client");
    const { PrismaPg } = await import("@prisma/adapter-pg");
    const { Pool } = await import("pg");
    pool = new Pool({
      connectionString: databaseUrl,
      connectionTimeoutMillis: 5000,
      query_timeout: 5000,
      statement_timeout: 5000,
    });
    const adapter = new PrismaPg(pool);
    prisma = new PrismaClient({ adapter });
    await prisma.worksheetEntry.deleteMany({ where: { studentId } });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("[clearWorksheetEntries] cleanup failed (non-fatal):", err);
  } finally {
    if (prisma) {
      try {
        await prisma.$disconnect();
      } catch {
        // ignore
      }
    }
    if (pool) {
      try {
        await pool.end();
      } catch {
        // ignore
      }
    }
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
