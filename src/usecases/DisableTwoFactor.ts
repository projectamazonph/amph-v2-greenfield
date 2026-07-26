/**
 * DisableTwoFactor — turn off admin TOTP 2FA.
 *
 * Audit hardening follow-up. Requires the account's current password
 * (not a TOTP code) as the re-confirmation step — mirrors how
 * disabling a security feature typically re-checks "something you
 * know" rather than "something you have," and doesn't require the
 * admin to have their authenticator app on hand just to turn 2FA off
 * (e.g. after losing the device, which is exactly when they'd need to
 * disable it).
 */

import { Result } from "@/domain/shared/Result";
import type { UserRepository, UserError } from "@/ports/repositories/UserRepository";
import type { PasswordHasher } from "@/ports/security/PasswordHasher";
import { RecordAuditLog } from "@/usecases/RecordAuditLog";

export interface DisableTwoFactorInput {
  userId: string;
  password: string;
}

export type DisableTwoFactorError =
  { kind: "user_not_found" } | { kind: "wrong_password" } | UserError;

export type DisableTwoFactorResult = Result<{ disabled: true }, DisableTwoFactorError>;

export interface DisableTwoFactorDeps {
  userRepo: UserRepository;
  hasher: PasswordHasher;
  recordAuditLog: RecordAuditLog;
}

export class DisableTwoFactor {
  constructor(private readonly deps: DisableTwoFactorDeps) {}

  async execute(input: DisableTwoFactorInput): Promise<DisableTwoFactorResult> {
    const hashResult = await this.deps.userRepo.getPasswordHash(input.userId);
    if (!hashResult.ok) {
      return Result.err(
        hashResult.error.kind === "not_found" ? { kind: "user_not_found" } : hashResult.error,
      );
    }

    const verifyResult = await this.deps.hasher.verify(input.password, hashResult.value);
    if (!verifyResult.ok || !verifyResult.value) {
      return Result.err({ kind: "wrong_password" });
    }

    const clearResult = await this.deps.userRepo.setTwoFactorSecret(input.userId, null);
    if (!clearResult.ok) {
      return Result.err(
        clearResult.error.kind === "not_found" ? { kind: "user_not_found" } : clearResult.error,
      );
    }

    const updateResult = await this.deps.userRepo.update(input.userId, { twoFactorEnabled: false });
    if (!updateResult.ok) {
      return Result.err(
        updateResult.error.kind === "not_found" ? { kind: "user_not_found" } : updateResult.error,
      );
    }

    // Best-effort — RecordAuditLog swallows its own errors.
    await this.deps.recordAuditLog.execute({
      actorId: input.userId,
      action: "user.2fa_disabled",
      targetType: "user",
      targetId: input.userId,
      metadata: {},
    });

    return Result.ok({ disabled: true });
  }
}
