/**
 * AdminDeleteUser — admin permanently anonymizes and deletes a user account.
 *
 * This is a hard delete that:
 *   1. Scrubs PII from the user row (email, name, phone, avatar, bio)
 *      using UserRepository.anonymizeAndDelete(), which stamps deletedAt.
 *   2. Revokes all sessions for the user.
 *
 * Financial/audit records (Order, Enrollment, Certificate, AuditLog) are NOT
 * cascade-deleted — they keep referencing the userId so tax and audit trails
 * survive account deletion per the receipt-retention policy in
 * docs/business-layer.md.
 *
 * This action is irreversible and is audit-logged as user.deleted_by_admin.
 */

import { Result } from "@/domain/shared/Result";
import type { UserRepository } from "@/ports/repositories/UserRepository";
import type { SessionRepository } from "@/ports/repositories/SessionRepository";
import type { RecordAuditLog } from "@/usecases/RecordAuditLog";

export interface AdminDeleteUserInput {
  userId: string;
  actorId: string;
}

export type AdminDeleteUserError =
  | { kind: "user_not_found" }
  | { kind: "cannot_delete_self" }
  | { kind: "db_error"; message: string };

export interface AdminDeleteUserOutput {
  userId: string;
}

export type AdminDeleteUserResult = Result<AdminDeleteUserOutput, AdminDeleteUserError>;

export interface AdminDeleteUserDeps {
  userRepo: UserRepository;
  sessionRepo: SessionRepository;
  recordAuditLog: RecordAuditLog;
}

export class AdminDeleteUser {
  constructor(private readonly deps: AdminDeleteUserDeps) {}

  async execute(input: AdminDeleteUserInput): Promise<AdminDeleteUserResult> {
    if (input.userId === input.actorId) {
      return Result.err({ kind: "cannot_delete_self" });
    }

    const anonymizedEmail = `deleted-${input.userId}@redacted`;

    const deleteResult = await this.deps.userRepo.anonymizeAndDelete(input.userId, anonymizedEmail);

    if (!deleteResult.ok) {
      if (deleteResult.error.kind === "not_found") {
        return Result.err({ kind: "user_not_found" });
      }
      if (deleteResult.error.kind === "db_error") {
        return Result.err({ kind: "db_error", message: deleteResult.error.message });
      }
      return Result.err({ kind: "db_error", message: "Unknown error" });
    }

    await this.deps.sessionRepo.deleteAllForUser(input.userId);

    await this.deps.recordAuditLog.execute({
      actorId: input.actorId,
      action: "user.deleted_by_admin",
      targetType: "user",
      targetId: input.userId,
      metadata: { anonymizedEmail },
    });

    return Result.ok({ userId: input.userId });
  }
}
