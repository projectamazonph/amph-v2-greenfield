import { NextResponse } from "next/server";
import { Result } from "@/domain/shared/Result";
import { buildContainer } from "@/composition/container";

/**
 * GET /api/health/ready
 *
 * Readiness probe — Proposal 5. Unlike /api/health (a static liveness
 * check that returns 200 as long as the Next.js server process is up),
 * this actually queries the database via the container's
 * DatabaseHealthCheck port (PrismaDatabaseHealthCheck in production).
 * Use it for load-balancer / orchestrator readiness checks that should
 * hold traffic back until the app can really serve requests, not just
 * that the process started.
 *
 * Deliberately NOT `force-static` — it must run on every request.
 * Returns 503 (not 200) on DB failure, and never leaks the raw error
 * (connection string, stack trace) to the caller — only logs it
 * server-side.
 */

export const dynamic = "force-dynamic";

export async function GET() {
  const container = buildContainer();
  const result = await container.databaseHealthCheck.ping();

  if (Result.isErr(result)) {
    console.error("[health/ready] database check failed:", result.error.message);
    return NextResponse.json(
      {
        status: "unavailable",
        service: "amph-v2-greenfield",
        timestamp: new Date().toISOString(),
      },
      { status: 503 },
    );
  }

  return NextResponse.json({
    status: "ok",
    service: "amph-v2-greenfield",
    timestamp: new Date().toISOString(),
  });
}
