/**
 * ConfirmTwoFactor — confirm admin TOTP 2FA enrollment.
 *
 * Audit hardening follow-up. Verifies a code from the pending secret
 * EnableTwoFactor generated; only on success does twoFactorEnabled
 * flip to true (so a secret an admin scanned but never verified never
 * silently gates their login).
 */

import { Result } from "@/domain/shared/Result";
import type { UserRepository, UserError } from "@/ports/repositories/UserRepository";
import type { TotpService } from "@/ports/security/TotpService";
import { RecordAuditLog } from "@/usecases/RecordAuditLog";

export interface ConfirmTwoFactorInput {
  userId: string;
  code: string;
}

export type ConfirmTwoFactorError =
  { kind: "user_not_found" } | { kind: "no_pending_secret" } | { kind: "invalid_code" } | UserError;

export type ConfirmTwoFactorResult = Result<{ enabled: true }, ConfirmTwoFactorError>;

export interface ConfirmTwoFactorDeps {
  userRepo: UserRepository;
  totpService: TotpService;
  recordAuditLog: RecordAuditLog;
}

export class ConfirmTwoFactor {
  constructor(private readonly deps: ConfirmTwoFactorDeps) {}

  async execute(input: ConfirmTwoFactorInput): Promise<ConfirmTwoFactorResult> {
    const secretResult = await this.deps.userRepo.getTwoFactorSecret(input.userId);
    if (!secretResult.ok) {
      return Result.err(
        secretResult.error.kind === "not_found" ? { kind: "user_not_found" } : secretResult.error,
      );
    }
    if (!secretResult.value) {
      return Result.err({ kind: "no_pending_secret" });
    }

    const valid = this.deps.totpService.verify(secretResult.value, input.code);
    if (!valid) {
      return Result.err({ kind: "invalid_code" });
    }

    const updateResult = await this.deps.userRepo.update(input.userId, { twoFactorEnabled: true });
    if (!updateResult.ok) {
      return Result.err(
        updateResult.error.kind === "not_found" ? { kind: "user_not_found" } : updateResult.error,
      );
    }

    // Best-effort — RecordAuditLog swallows its own errors.
    await this.deps.recordAuditLog.execute({
      actorId: input.userId,
      action: "user.2fa_enabled",
      targetType: "user",
      targetId: input.userId,
      metadata: {},
    });

    return Result.ok({ enabled: true });
  }
}
