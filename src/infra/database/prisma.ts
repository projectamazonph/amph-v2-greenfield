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
 *
 * Lazy construction (production-readiness audit): `prisma` is a Proxy
 * that only calls createPrismaClient() on first property access, not on
 * import. `next build`'s page-data collection step imports every route
 * module (including this one, transitively) to inspect its exports;
 * eager construction here used to throw "DATABASE_URL environment
 * variable is not set" during build in any environment where the var
 * isn't present at build time, even though no request was ever served.
 * Runtime behavior is unchanged: the first real `prisma.<model>.*` call
 * still constructs and caches exactly one client, same as before.
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

function getPrismaClient(): PrismaClient {
  if (globalForPrisma.prisma) return globalForPrisma.prisma;
  const client = createPrismaClient();
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = client;
  }
  return client;
}

let _instance: PrismaClient | undefined;

export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    _instance ??= getPrismaClient();
    // Receiver defaults to _instance itself (not the proxy) so any
    // getter on the real client runs with the correct `this`.
    return Reflect.get(_instance, prop, _instance);
  },
});
