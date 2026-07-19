/**
 * POST /api/quizzes/[quizId]/attempt — student submits a quiz attempt.
 *
 * STORY-033: Quiz submission API.
 *
 * The handler is intentionally thin — it does HTTP-layer work only:
 *   1. Extract userId from the session via getSessionUserId (src/lib/auth.ts)
 *   2. Parse the JSON body
 *   3. Delegate to processQuizAttempt
 *   4. Map the result to a NextResponse
 *
 * All business logic lives in `processQuizAttempt.ts` so it can be
 * unit-tested without HTTP.
 *
 * SOLID note: this route uses getSessionUserId from src/lib/auth.ts
 * (the single source of truth for session reading). It does NOT
 * instantiate JoseJwtService directly, which would bypass the
 * composition root and the env-flavor handling in src/lib/auth.ts.
 */

import { NextRequest, NextResponse } from "next/server";
import { buildContainer } from "@/composition/container";
import { getSessionUserId } from "@/lib/auth";
import { processQuizAttempt } from "./processQuizAttempt";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ quizId: string }> },
): Promise<NextResponse> {
  const { quizId } = await context.params;

  // ── 1. Auth: read userId via the sanctioned helper ─────────
  const userId = (await getSessionUserId()) ?? "";

  // ── 2. Parse body ────────────────────────────────────────
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: { kind: "validation_error", message: "Invalid JSON body" } },
      { status: 400 },
    );
  }

  // ── 3. Delegate to the pure handler ──────────────────────
  const container = buildContainer();
  const result = await processQuizAttempt(container, {
    quizId,
    userId,
    body,
  });

  // ── 4. Map result to HTTP ────────────────────────────────
  if (result.ok) {
    return NextResponse.json(result.value, { status: result.status });
  }
  return NextResponse.json({ error: result.error }, { status: result.status });
}
