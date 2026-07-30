/**
 * Health check endpoint — Story 004.
 * Returns 200 if the app is running and the database is reachable.
 * Returns 503 if the database connection fails.
 *
 * Uses the composition container's courseRepo as a lightweight DB ping
 * to comply with the architecture rule that app-layer code must not
 * import Prisma or infra directly.
 */

import { NextResponse } from "next/server";
import { buildContainer } from "@/composition/container";

export async function GET() {
  const started = Date.now();

  try {
    // A lightweight DB ping: listAll() on courseRepo exercises the
    // Prisma connection without loading heavy aggregates.
    const { courseRepo } = buildContainer();
    const result = await courseRepo.listAll();

    if (!result.ok) {
      throw new Error(`courseRepo.listAll failed: ${result.error.kind}`);
    }

    const latencyMs = Date.now() - started;

    return NextResponse.json(
      {
        status: "ok",
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version ?? "0.1.0",
        db: { status: "ok", latencyMs },
      },
      { status: 200 },
    );
  } catch (err: unknown) {
    const latencyMs = Date.now() - started;

    return NextResponse.json(
      {
        status: "error",
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version ?? "0.1.0",
        db: { status: "unreachable", latencyMs, error: String(err) },
      },
      { status: 503 },
    );
  }
}
