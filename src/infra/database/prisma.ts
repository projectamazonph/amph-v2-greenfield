/**
 * Prisma singleton — Story 002.
 *
 * The Prisma client is instantiated once and reused across all requests.
 * In Next.js App Router (server components + server actions), this module
 * is imported at the module level. Prisma handles connection pooling
 * via the DATABASE_URL connection string (PgBouncer-compatible).
 *
 * NEVER use `new PrismaClient()` outside of this module. Import `prisma`
 * from here everywhere you need the client.
 */

import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
