/**
 * DatabaseHealthCheck port — Proposal 5 (readiness probe).
 *
 * A single narrow abstraction for "is the database reachable right
 * now?", so /api/health/ready doesn't need to import @/infra/* (or
 * @prisma/client) directly from src/app/ — the ESLint boundary rule
 * and tests/architecture/dependency-direction.test.ts both forbid
 * that. Go through the composition container instead.
 */

import type { Result } from "@/domain/shared/Result";

export type DatabaseHealthCheckError = { kind: "db_error"; message: string };

export interface DatabaseHealthCheck {
  /** Lightweight connectivity check (e.g. `SELECT 1`). */
  ping(): Promise<Result<void, DatabaseHealthCheckError>>;
}
