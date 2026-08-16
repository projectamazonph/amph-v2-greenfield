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
 *
 * Proposal 6 (2026-08-16): also asserts that every simulator registered
 * in the SimulatorRegistry has at least one published SimulatorScenario
 * row. Without this row, StartSimulatorAttempt / GradeSimulatorAttempt
 * fail with `scenario_not_found` at request time, surfacing as the
 * generic "Something went wrong" page students see on the simulator
 * routes. Detecting this at deploy time (via the readiness probe) is
 * far cheaper than catching it from a user report. When the check fails
 * we return 503 with `status: "missing_scenarios"` and a `missing: [...]`
 * array listing the offending simulator ids, so the operator runbook
 * (docs/runbooks/simulator-scenario-missing.md → "Mitigation") can be
 * followed without re-reading the codebase.
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

  // Scenario data-integrity check. Only reached when the DB ping
  // succeeded; a real `findPublished` error after a successful ping is
  // a transient DB problem that should fail-fast as `unavailable`, not
  // be papered over as a missing row.
  const registered = container.simulatorRegistry.list();
  const missing: string[] = [];

  for (const simulator of registered) {
    const scenarioResult = await container.scenarioRepo.findPublished(simulator.simulatorId);
    if (Result.isErr(scenarioResult)) {
      console.error(
        "[health/ready] findPublished failed for",
        simulator.simulatorId,
        ":",
        scenarioResult.error,
      );
      return NextResponse.json(
        {
          status: "unavailable",
          service: "amph-v2-greenfield",
          timestamp: new Date().toISOString(),
        },
        { status: 503 },
      );
    }
    if (scenarioResult.value === null) {
      missing.push(simulator.simulatorId);
    }
  }

  if (missing.length > 0) {
    console.error(
      "[health/ready] missing published SimulatorScenario rows for simulators:",
      missing,
    );
    return NextResponse.json(
      {
        status: "missing_scenarios",
        service: "amph-v2-greenfield",
        timestamp: new Date().toISOString(),
        missing,
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
