/**
 * POST /api/cron/live-class-reminders — cron entry point.
 *
 * P0-7: called by an external cron (Vercel Cron, GitHub Actions, etc.)
 * every 5 minutes. Returns the count of emails sent.
 *
 * Auth: protected by a shared secret in the `x-cron-secret` header.
 * The cron service must send this header; we compare against
 * process.env.CRON_SECRET (configured in Vercel).
 *
 * Idempotency note:
 *   The use case is NOT idempotent. If the cron runs twice in the
 *   same window, students get duplicate emails. The proper fix is
 *   a SentReminder log table — track as a follow-up.
 *
 *   For now, configure the cron to run at most once per 5 minutes
 *   and accept the small overlap during deploys.
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { buildContainer } from "@/composition/container";
import { Result } from "@/domain/shared/Result";

export async function POST(req: NextRequest): Promise<NextResponse> {
  // 1. Auth: shared secret in header
  const expected = process.env["CRON_SECRET"];
  if (!expected) {
    return NextResponse.json(
      { error: "CRON_SECRET not configured" },
      { status: 500 },
    );
  }
  const provided = req.headers.get("x-cron-secret");
  if (provided !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // 2. Run the use case
  const container = buildContainer();
  const result = await container.sendLiveClassReminders.execute();

  if (Result.isOk(result)) {
    return NextResponse.json({
      ok: true,
      emailsSent: result.value.emailsSent,
      classesProcessed: result.value.classesProcessed,
    });
  }
  return NextResponse.json(
    { ok: false, error: result.error },
    { status: 500 },
  );
}

/**
 * GET — health check. Returns 200 if CRON_SECRET is set, 500 otherwise.
 * Useful for the cron provider's status check.
 */
export async function GET(): Promise<NextResponse> {
  const hasSecret = Boolean(process.env["CRON_SECRET"]);
  return NextResponse.json(
    { ok: hasSecret, secretConfigured: hasSecret },
    { status: hasSecret ? 200 : 500 },
  );
}
