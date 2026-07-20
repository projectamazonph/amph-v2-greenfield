/**
 * POST /actions/verifyEmail — proxy for the verifyEmailAction.
 *
 * STORY-007: the auto-submit form on /verify-email posts here
 * with a `token` field. The route forwards to the server action
 * (which calls container.verifyEmail) and handles the redirect.
 *
 * Server actions are POST endpoints internally, but exposing them
 * via a route handler is cleaner here because we want a stable,
 * named URL the page can target directly.
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { verifyEmailAction } from "../verifyEmail.action";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const formData = await req.formData();
  await verifyEmailAction(formData);
  // verifyEmailAction always redirects (or throws on error),
  // so this is unreachable in practice.
  return NextResponse.json({ ok: true });
}
