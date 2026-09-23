/**
 * AdminForceSignOut — admin revokes all active sessions for a user,
 * forcing the user to re-authenticate on all devices.
 *
 * Used when a user reports their account is compromised, or when an admin
 * needs to immediately lock someone out without deleting their account.
 */

import { Result } from "@/domain/shared/Result";
import type { SessionRepository } from "@/ports/repositories/SessionRepository";
import type { RecordAuditLog } from "@/usecases/RecordAuditLog";

export interface AdminForceSignOutInput {
  userId: string;
  actorId: string;
}

export type AdminForceSignOutError = { kind: "db_error"; message: string };

export interface AdminForceSignOutOutput {
  userId: string;
}

export type AdminForceSignOutResult = Result<AdminForceSignOutOutput, AdminForceSignOutError>;

export interface AdminForceSignOutDeps {
  sessionRepo: SessionRepository;
  recordAuditLog: RecordAuditLog;
}

export class AdminForceSignOut {
  constructor(private readonly deps: AdminForceSignOutDeps) {}

  async execute(input: AdminForceSignOutInput): Promise<AdminForceSignOutResult> {
    const result = await this.deps.sessionRepo.deleteAllForUser(input.userId);

    if (!result.ok) {
      if (result.error.kind === "db_error") {
        return Result.err({ kind: "db_error", message: result.error.message });
      }
      return Result.err({ kind: "db_error", message: "Unknown error" });
    }

    await this.deps.recordAuditLog.execute({
      actorId: input.actorId,
      action: "user.sessions_revoked",
      targetType: "user",
      targetId: input.userId,
    });

    return Result.ok({ userId: input.userId });
  }
}
