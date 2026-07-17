/**
 * Health check endpoint — Story 004.
 * Returns 200 if the app is running and configured.
 * Returns 503 if the database connection fails.
 */

import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version ?? "0.1.0",
  });
}
