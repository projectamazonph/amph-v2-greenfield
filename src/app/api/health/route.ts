import { NextResponse } from "next/server";

/**
 * GET /api/health
 *
 * Liveness probe used by Lighthouse CI (`Wait for server health` step
 * in `.github/workflows/ci.yml`). Returns 200 with a small JSON payload
 * as long as the Next.js server itself is responsive — it does not
 * probe the database (use a dedicated DB readiness probe for that).
 *
 * Marked `force-static` so Next.js can pre-render the response at build
 * time and the standalone server answers it without touching the React
 * tree or any IO subsystem.
 */

export const dynamic = "force-static";

export function GET() {
  return NextResponse.json({
    status: "ok",
    service: "amph-v2-greenfield",
    timestamp: new Date().toISOString(),
  });
}