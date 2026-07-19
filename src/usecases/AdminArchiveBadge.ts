/**
 * AdminArchiveBadge — archive a badge template.
 *
 * STORY-050e. Calls recordAuditLog on success/failure. Idempotent.
 */
import { Result } from "@/domain/shared/Result";
import type { IBadgeRepository } from "@/ports/repositories/IBadgeRepository";
import type { RecordAuditLog } from "@/usecases/RecordAuditLog";
import type { BadgeSlug } from "@/domain/entities/Badge";

export interface AdminArchiveBadgeInput {
  slug: BadgeSlug;
  actorId: string;
}

export interface AdminArchiveBadgeDeps {
  badgeRepo: IBadgeRepository;
  recordAuditLog: RecordAuditLog;
}

export type AdminArchiveBadgeError =
  | { kind: "not_found" }
  | { kind: "db_error"; message: string };
export type AdminArchiveBadgeResult = Result<{ badgeSlug: BadgeSlug }, AdminArchiveBadgeError>;

export class AdminArchiveBadge {
  constructor(private readonly deps: AdminArchiveBadgeDeps) {}

  async execute(input: AdminArchiveBadgeInput): Promise<AdminArchiveBadgeResult> {
    const r = await this.deps.badgeRepo.archive(input.slug);
    if (!r.ok) {
      if (r.error.kind === "not_found") {
        await this.deps.recordAuditLog.execute({
          actorId: input.actorId,
          action: "badge.archive_failed",
          targetType: "badge",
          targetId: input.slug,
          metadata: { reason: "not_found" },
        });
        return Result.err({ kind: "not_found" });
      }
      if (r.error.kind === "db_error") {
        await this.deps.recordAuditLog.execute({
          actorId: input.actorId,
          action: "badge.archive_failed",
          targetType: "badge",
          targetId: input.slug,
          metadata: { reason: "db_error", message: r.error.message },
        });
        return Result.err({ kind: "db_error", message: r.error.message });
      }
      return Result.err({ kind: "db_error", message: "unknown" });
    }

    await this.deps.recordAuditLog.execute({
      actorId: input.actorId,
      action: "badge.archived",
      targetType: "badge",
      targetId: input.slug,
      metadata: {},
    });

    return Result.ok({ badgeSlug: input.slug });
  }
}
