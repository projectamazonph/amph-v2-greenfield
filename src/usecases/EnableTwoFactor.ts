/**
 * EnableTwoFactor — start admin TOTP 2FA enrollment.
 *
 * Audit hardening follow-up (docs/audit-2026-07-26-hardening-review.md).
 * Opt-in: generates a new secret and stores it as "pending" (persisted,
 * but twoFactorEnabled stays false until ConfirmTwoFactor validates a
 * real code from it). Existing admins are unaffected until they go
 * through this flow themselves — no forced enrollment, no risk of
 * locking anyone out on deploy.
 *
 * Calling this again before confirming overwrites the pending secret —
 * that's intentional (re-scanning a QR code should just start over).
 */

import { Result } from "@/domain/shared/Result";
import type { UserRepository, UserError } from "@/ports/repositories/UserRepository";
import type { TotpService } from "@/ports/security/TotpService";

export interface EnableTwoFactorInput {
  userId: string;
}

export type EnableTwoFactorError =
  { kind: "user_not_found" } | { kind: "already_enabled" } | UserError;

export type EnableTwoFactorResult = Result<
  { secret: string; keyUri: string },
  EnableTwoFactorError
>;

export interface EnableTwoFactorDeps {
  userRepo: UserRepository;
  totpService: TotpService;
}

/** Exported so the 2FA setup page can recompute the same keyUri from
 * the already-persisted pending secret without calling execute()
 * again (which would generate — and persist — a brand new secret). */
export const TWO_FACTOR_ISSUER = "Project Amazon PH Academy";

export class EnableTwoFactor {
  constructor(private readonly deps: EnableTwoFactorDeps) {}

  async execute(input: EnableTwoFactorInput): Promise<EnableTwoFactorResult> {
    const userResult = await this.deps.userRepo.findById(input.userId);
    if (!userResult.ok) {
      return Result.err(
        userResult.error.kind === "not_found" ? { kind: "user_not_found" } : userResult.error,
      );
    }
    const user = userResult.value;

    if (user.twoFactorEnabled) {
      return Result.err({ kind: "already_enabled" });
    }

    const secret = this.deps.totpService.generateSecret();
    const setResult = await this.deps.userRepo.setTwoFactorSecret(input.userId, secret);
    if (!setResult.ok) {
      return Result.err(setResult.error);
    }

    const keyUri = this.deps.totpService.keyUri({
      secret,
      accountName: user.email,
      issuer: TWO_FACTOR_ISSUER,
    });

    return Result.ok({ secret, keyUri });
  }
}
