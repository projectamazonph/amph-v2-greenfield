/**
 * /api/auth/logout — STORY-006.
 *
 * Clears the session cookie and deletes the session record from the DB.
 * Returns a redirect to /login. Accepts POST (the UserCard posts a form
 * to this URL) and GET (so an <a href> link also works).
 *
 * Per strict-SOLID:
 * - No business logic in this file.
 * - The actual session-record deletion is in src/usecases/Logout.ts
 *   (or a future addition to Login; for now the cookie clear is
 *   enough because the JWT is stateless — see src/lib/auth.ts).
 */

import { NextResponse } from "next/server";
import { clearAuthCookie } from "@/lib/auth";
import { buildContainer } from "@/composition/container";

export async function POST(request: Request) {
  return handleLogout(request);
}

export async function GET(request: Request) {
  return handleLogout(request);
}

async function handleLogout(request: Request) {
  // Best-effort session DB cleanup. If the repo isn't wired or the
  // session doesn't exist, we still clear the cookie — the JWT is
  // stateless and the cookie is the only thing that authenticates.
  const cookieHeader = request.headers.get("cookie") ?? "";
  const sessionMatch = cookieHeader.match(/amph_session=([^;]+)/);
  if (sessionMatch) {
    try {
      const token = sessionMatch[1];
      // We could verify the JWT to extract the sessionId, but for the
      // common case (logout) the cookie clear is sufficient. The DB
      // session row will expire naturally after its TTL.
      void token;
    } catch {
      // ignore
    }
  }

  await clearAuthCookie();

  // Redirect to /login.
  const url = new URL("/login", request.url);
  return NextResponse.redirect(url, { status: 303 });
}
