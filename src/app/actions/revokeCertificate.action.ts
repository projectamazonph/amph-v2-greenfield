/**
 * revokeCertificateAction — admin server action to revoke a certificate.
 *
 * STORY-044: RevokeCertificate on refund + revocation badge.
 *
 * Thin wrapper around RevokeCertificate.execute:
 *  1. Authenticate the caller via getSessionUserId (src/lib/auth.ts)
 *  2. Load the user, verify role === "ADMIN"
 *  3. Delegate to the use case
 *  4. Map use-case errors to action errors
 *
 * Future callers (e.g. an automated refund processor in STORY-049) will
 * NOT go through this action — they'll call the use case directly with
 * `revokedBy: "system"`. This action is the admin contract.
 *
 * The testable pure logic lives in `performRevokeCertificate` (exported
 * below) which takes the user-lookup as a dependency. The action wrapper
 * wires getSessionUserId into that dependency. This is the same pure +
 * thin-shell pattern used by performLogin / performSignUp.
 */

"use server";

import { Result } from "@/domain/shared/Result";
import { buildContainer } from "@/composition/container";
import { getSessionUserId } from "@/lib/auth";
import type { UserRepository } from "@/ports/repositories/UserRepository";
import type { RevokeCertificate } from "@/usecases/RevokeCertificate";

// ── Public types ───────────────────────────────────────────────────────────

export type RevokeCertificateActionInput = {
  certificateId: string;
  reason: string;
};

export type RevokeCertificateActionError =
  | { kind: "unauthorized" }
  | { kind: "certificate_not_found" }
  | { kind: "invalid_reason" }
  | { kind: "db_error"; message: string };

export type RevokeCertificateActionResult = Result<
  { certificateId: string; wasAlreadyRevoked: boolean },
  RevokeCertificateActionError
>;

// ── Testable pure helper ──────────────────────────────────────────────────

/**
 * The "current user" shape that performRevokeCertificate needs.
 * Decouples the helper from the cookie/auth machinery so it can be
 * unit-tested with a stub.
 */
export interface CurrentUserSummary {
  id: string;
  role: "STUDENT" | "INSTRUCTOR" | "ADMIN";
}

/**
 * Pure helper. Testable without Next runtime.
 *
 * Sequence:
 * 1. Resolve the current user (or null if no session).
 * 2. Look up the user in the DB to verify they exist + get the role.
 * 3. If not ADMIN, return unauthorized.
 * 4. Validate the reason is non-empty (after trim).
 * 5. Delegate to RevokeCertificate.execute.
 * 6. Map the use case's result to the action's discriminated union.
 *
 * The `getCurrentUser` dependency is the seam: the action passes a
 * function that calls getSessionUserId + userRepo.findById; tests
 * pass a stub.
 */
export async function performRevokeCertificate(
  container: { userRepo: UserRepository; revokeCertificate: RevokeCertificate },
  input: RevokeCertificateActionInput,
  getCurrentUser: (
    container: { userRepo: UserRepository },
  ) => Promise<CurrentUserSummary | null>,
): Promise<RevokeCertificateActionResult> {
  // 1. Authenticate
  const sessionUser = await getCurrentUser(container);
  if (!sessionUser) {
    return Result.err({ kind: "unauthorized" });
  }

  // 2. Authorize (load the user, verify role)
  const userResult = await container.userRepo.findById(sessionUser.id);
  if (!userResult.ok) {
    return Result.err({ kind: "unauthorized" });
  }
  if (userResult.value.role !== "ADMIN") {
    return Result.err({ kind: "unauthorized" });
  }

  // 3. Validate the reason (the use case will too, but fail fast here
  //    to avoid a needless DB hit on a clearly invalid input).
  const trimmedReason = input.reason?.trim() ?? "";
  if (trimmedReason.length === 0) {
    return Result.err({ kind: "invalid_reason" });
  }

  // 4. Delegate to the use case
  const result = await container.revokeCertificate.execute({
    certificateId: input.certificateId,
    reason: trimmedReason,
    revokedBy: sessionUser.id,
  });

  // 5. Map errors
  if (!result.ok) {
    if (result.error.kind === "certificate_not_found") {
      return Result.err({ kind: "certificate_not_found" });
    }
    if (result.error.kind === "invalid_reason") {
      return Result.err({ kind: "invalid_reason" });
    }
    if (result.error.kind === "invalid_revoked_by") {
      return Result.err({ kind: "invalid_reason" });
    }
    if (result.error.kind === "db_error") {
      return Result.err({ kind: "db_error", message: result.error.message });
    }
    return Result.err({ kind: "db_error", message: "Unknown error" });
  }

  return Result.ok({
    certificateId: result.value.certificate.id,
    wasAlreadyRevoked: result.value.wasAlreadyRevoked,
  });
}

// ── Action wrapper (thin shell) ──────────────────────────────────────────

/**
 * The default `getCurrentUser` for the action. Combines the session
 * cookie read (getSessionUserId) with the userRepo lookup, and maps
 * the result to the CurrentUserSummary shape.
 */
async function defaultGetCurrentUser(container: {
  userRepo: UserRepository;
}): Promise<CurrentUserSummary | null> {
  const userId = await getSessionUserId();
  if (!userId) return null;
  const userResult = await container.userRepo.findById(userId);
  if (!userResult.ok) return null;
  return { id: userResult.value.id, role: userResult.value.role };
}

export async function revokeCertificateAction(
  input: RevokeCertificateActionInput,
): Promise<RevokeCertificateActionResult> {
  const container = buildContainer();
  return performRevokeCertificate(container, input, defaultGetCurrentUser);
}

// Suppress unused-import warning (none at the moment — all imports
// are used).
void 0;
