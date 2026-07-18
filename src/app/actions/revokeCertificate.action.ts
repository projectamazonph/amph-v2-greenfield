/**
 * revokeCertificateAction — admin server action to revoke a certificate.
 *
 * STORY-044: RevokeCertificate on refund + revocation badge.
 *
 * Thin wrapper around RevokeCertificate.execute:
 *  1. Authenticate the caller via the session cookie
 *  2. Load the user, verify role === "ADMIN"
 *  3. Delegate to the use case
 *  4. Map use-case errors to action errors
 *
 * Future callers (e.g. an automated refund processor in STORY-049) will
 * NOT go through this action — they'll call the use case directly with
 * `revokedBy: "system"`. This action is the admin contract.
 */

"use server";

import { cookies } from "next/headers";
import { Result } from "@/domain/shared/Result";
import { buildContainer } from "@/composition/container";
import { JoseJwtService } from "@/infra/security/JoseJwtService";

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

// ── Helpers ────────────────────────────────────────────────────────────────

const SESSION_COOKIES = ["amph_session", "__Secure-amph_session"] as const;

async function getUserIdFromSession(): Promise<string | null> {
  const cookieStore = await cookies();
  let token: string | undefined;
  for (const name of SESSION_COOKIES) {
    const value = cookieStore.get(name)?.value;
    if (value) {
      token = value;
      break;
    }
  }
  if (!token) return null;

  const secret = process.env.JWT_SECRET ?? "";
  if (secret.length < 32) return null;

  const jwt = new JoseJwtService(secret);
  const verified = await jwt.verify(token);
  if (!verified.ok) return null;
  if (typeof verified.value.sub !== "string") return null;
  return verified.value.sub;
}

// ── Server action ──────────────────────────────────────────────────────────

export async function revokeCertificateAction(
  input: RevokeCertificateActionInput,
): Promise<RevokeCertificateActionResult> {
  // ── 1. Authenticate ──────────────────────────────────────
  const userId = await getUserIdFromSession();
  if (!userId) {
    return Result.err({ kind: "unauthorized" });
  }

  // ── 2. Authorize (admin role) ───────────────────────────
  const container = buildContainer();
  const userResult = await container.userRepo.findById(userId);
  if (!userResult.ok) {
    return Result.err({ kind: "unauthorized" });
  }
  const user = userResult.value;
  if (user.role !== "ADMIN") {
    return Result.err({ kind: "unauthorized" });
  }

  // ── 3. Delegate to the use case ─────────────────────────
  const result = await container.revokeCertificate.execute({
    certificateId: input.certificateId,
    reason: input.reason,
    revokedBy: userId,
  });

  // ── 4. Map errors ───────────────────────────────────────
  if (!result.ok) {
    if (result.error.kind === "certificate_not_found") {
      return Result.err({ kind: "certificate_not_found" });
    }
    if (result.error.kind === "invalid_reason") {
      return Result.err({ kind: "invalid_reason" });
    }
    if (result.error.kind === "invalid_revoked_by") {
      // Unreachable in practice (we pass userId which is non-empty by construction),
      // but map it to invalid_reason for the action contract.
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
