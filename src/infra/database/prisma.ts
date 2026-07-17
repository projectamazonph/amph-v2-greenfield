/**
 * Prisma singleton — Story 002.
 *
 * The Prisma client is instantiated once and reused across all requests.
 * In Next.js App Router (server components + server actions), this module
 * is imported at the module level. Prisma handles connection pooling
 * via the DATABASE_URL connection string (PgBouncer-compatible).
 *
 * In Prisma 7, the connection is provided via a driver adapter.
 * NEVER use `new PrismaClient()` outside of this module. Import `prisma`
 * from here everywhere you need the client.
 */

import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is not set");
  }
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
