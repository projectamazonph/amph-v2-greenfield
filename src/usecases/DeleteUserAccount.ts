/**
 * DeleteUserAccount — student self-service account deletion.
 *
 * STORY-096. Requires the current password as re-confirmation, same
 * pattern as DisableTwoFactor: a destructive security action re-checks
 * "something you know" rather than trusting a live session alone.
 *
 * Anonymizes the User row (see UserRepository.anonymizeAndDelete's
 * docblock for exactly what's scrubbed and what's deliberately kept),
 * revokes every session so any other logged-in device is signed out
 * immediately, and records an audit log entry.
 *
 * Financial and academic records (Order, Enrollment, Certificate,
 * BadgeAward, XPEvent, ProgressEvent rows) are NOT deleted — they keep
 * referencing this userId. This is intentional: receipts and
 * certificates must survive for tax/audit compliance and certificate
 * verification even after the account itself is gone.
 */
import { Result } from "@/domain/shared/Result";
import type { UserRepository, UserError } from "@/ports/repositories/UserRepository";
import type { PasswordHasher } from "@/ports/security/PasswordHasher";
import type { SessionRepository } from "@/ports/repositories/SessionRepository";
import { RecordAuditLog } from "@/usecases/RecordAuditLog";

export interface DeleteUserAccountInput {
  userId: string;
  password: string;
}

export type DeleteUserAccountError =
  { kind: "user_not_found" } | { kind: "wrong_password" } | UserError;

export type DeleteUserAccountResult = Result<{ deleted: true }, DeleteUserAccountError>;

export interface DeleteUserAccountDeps {
  userRepo: UserRepository;
  hasher: PasswordHasher;
  sessionRepo: SessionRepository;
  recordAuditLog: RecordAuditLog;
}

export class DeleteUserAccount {
  constructor(private readonly deps: DeleteUserAccountDeps) {}

  async execute(input: DeleteUserAccountInput): Promise<DeleteUserAccountResult> {
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

    const anonymizedEmail = `deleted-${input.userId}@deleted.projectamazonph.invalid`;
    const deleteResult = await this.deps.userRepo.anonymizeAndDelete(input.userId, anonymizedEmail);
    if (!deleteResult.ok) {
      return Result.err(
        deleteResult.error.kind === "not_found" ? { kind: "user_not_found" } : deleteResult.error,
      );
    }

    // Best-effort — signing out other devices matters, but a failure
    // here shouldn't undo the anonymization that already succeeded.
    await this.deps.sessionRepo.deleteAllForUser(input.userId);

    // Best-effort — RecordAuditLog swallows its own errors.
    await this.deps.recordAuditLog.execute({
      actorId: input.userId,
      action: "user.account_deleted",
      targetType: "user",
      targetId: input.userId,
      metadata: {},
    });

    return Result.ok({ deleted: true });
  }
}
