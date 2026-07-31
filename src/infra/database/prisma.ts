/**
 * Prisma singleton — Story 002 / hardening audit.
 *
 * The Prisma client is instantiated once and reused across all requests.
 * In Next.js App Router (server components + server actions), this module
 * is imported at the module level.
 *
 * In Prisma 7, the connection is provided via a driver adapter.
 * NEVER use `new PrismaClient()` outside of this module. Import `prisma`
 * from here everywhere you need the client.
 *
 * Pool hardening (audit 2026-07-31):
 * - Explicit pool limits prevent connection storms under concurrent load.
 * - Idle timeout reclaims stale connections before the server kills them.
 * - Connection timeout surfaces unreachable DB fast instead of hanging.
 * - Pool error handler prevents unhandled errors from crashing the process.
 * - Graceful shutdown drains the pool on SIGTERM (serverless cold starts,
 *   Docker stop, etc.) so in-flight queries can finish cleanly.
 */

import { PrismaPg } from "@prisma/adapter-pg";
import { Pool, type PoolConfig } from "pg";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const poolConfig: PoolConfig = {
  max: Number(process.env.DB_POOL_MAX) || 5,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
};

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  const pool = new Pool({ connectionString, ...poolConfig });

  // Prevent unhandled pool errors from crashing the process.
  // Idle connections that drop emit 'error' — log and let the pool
  // evict the dead connection automatically.
  pool.on("error", (err) => {
    console.error("[prisma] Unexpected pool error", err);
  });

  // Graceful shutdown: drain the pool on SIGTERM/SIGINT so in-flight
  // queries can finish. Only registers once even if createPrismaClient()
  // is called multiple times during hot-reload.
  if (process.env.NODE_ENV === "production") {
    const shutdown = async () => {
      try {
        await pool.end();
      } catch {
        // best-effort — pool may already be closed
      }
    };
    process.removeAllListeners("SIGTERM");
    process.removeAllListeners("SIGINT");
    process.on("SIGTERM", shutdown);
    process.on("SIGINT", shutdown);
  }

  const adapter = new PrismaPg(pool);
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
