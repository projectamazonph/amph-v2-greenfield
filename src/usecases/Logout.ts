/**
 * Logout use case — STORY-006 (closing the gap from prep-2).
 *
 * Responsibility: invalidate a session.
 *
 * Sequence:
 * 1. Verify the JWT (the cookie's value) and extract the `sessionId`
 *    claim. If the token is empty / malformed / has a bad signature,
 *    the user is effectively already logged out — return invalid_token
 *    and let the route handler clear the cookie.
 * 2. Delete the session record from the SessionRepository. If the
 *    record is already gone, return not_found (idempotent logout
 *    is the expected behavior).
 * 3. Return ok. The route handler clears the cookie.
 *
 * The actual cookie clearing is NOT this use case's job — that's a
 * framework concern (next/headers). The thin-shell route handler at
 * /api/auth/logout orchestrates: call this use case, then clear the
 * cookie, then redirect.
 *
 * Why this exists as a separate use case (instead of inlining in the
 * route handler):
 * - The route handler is hard to unit-test (it depends on Next.js's
 *   request/response abstractions). The use case is pure: it takes
 *   a token, returns a result. Unit-testable.
 * - The "idempotent" semantics are business logic, not HTTP logic.
 *   A route-level implementation that returns 500 on already-deleted
 *   would be wrong.
 *
 * ADR-014: returns Result, never throws.
 */

import { Result } from "@/domain/shared/Result";
import type { SessionRepository } from "@/ports/repositories/SessionRepository";
import type { JwtService } from "@/ports/security/JwtService";

export type LogoutError =
  | { kind: "invalid_token" }
  | { kind: "db_error"; message: string };

export interface LogoutInput {
  token: string;
}

export class Logout {
  constructor(
    private readonly sessionRepo: SessionRepository,
    private readonly jwt: JwtService,
  ) {}

  async execute(input: LogoutInput): Promise<Result<void, LogoutError>> {
    if (!input.token) {
      return Result.err({ kind: "invalid_token" });
    }

    // 1. Verify the JWT
    const verifyResult = await this.jwt.verify(input.token);
    if (Result.isErr(verifyResult)) {
      return Result.err({ kind: "invalid_token" });
    }

    const sessionId = verifyResult.value.sessionId;
    if (typeof sessionId !== "string" || !sessionId) {
      // The JWT was valid but didn't carry a sessionId claim — that's
      // a malformed token for our purposes (we mint tokens that
      // always include sessionId).
      return Result.err({ kind: "invalid_token" });
    }

    // 2. Delete the session record. The repo's deleteById is
    //    idempotent (returns ok even if the record is already gone),
    //    so we only map actual DB errors.
    const deleteResult = await this.sessionRepo.deleteById(sessionId);
    if (Result.isErr(deleteResult)) {
      const err = deleteResult.error;
      if (err.kind === "db_error") {
        return Result.err({ kind: "db_error", message: err.message });
      }
      // SessionError's only remaining variant is not_found, but the
      // repo's deleteById is contractually idempotent so this
      // branch shouldn't be reachable. Map defensively.
      return Result.err({ kind: "db_error", message: "session delete failed" });
    }

    return Result.ok(undefined);
  }
}
