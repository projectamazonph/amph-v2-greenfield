/**
 * AdminUpdateBadge — update a badge template.
 *
 * STORY-050e. Calls recordAuditLog on success/failure.
 */
import { Result } from "@/domain/shared/Result";
import type { IBadgeRepository } from "@/ports/repositories/IBadgeRepository";
import type { RecordAuditLog } from "@/usecases/RecordAuditLog";
import { updateBadge, type Badge, type BadgeSlug } from "@/domain/entities/Badge";

export interface AdminUpdateBadgeInput {
  slug: BadgeSlug;
  patch: {
    name?: string;
    description?: string;
    iconName?: string;
    xpReward?: number;
    archived?: boolean;
  };
  actorId: string;
}

export interface AdminUpdateBadgeDeps {
  badgeRepo: IBadgeRepository;
  recordAuditLog: RecordAuditLog;
}

export type AdminUpdateBadgeError =
  | { kind: "not_found" }
  | { kind: "db_error"; message: string };
export type AdminUpdateBadgeResult = Result<{ badge: Badge }, AdminUpdateBadgeError>;

export class AdminUpdateBadge {
  constructor(private readonly deps: AdminUpdateBadgeDeps) {}

  async execute(input: AdminUpdateBadgeInput): Promise<AdminUpdateBadgeResult> {
    const found = await this.deps.badgeRepo.findBySlug(input.slug);
    if (!found.ok) {
      if (found.error.kind === "db_error") {
        return Result.err({ kind: "db_error", message: found.error.message });
      }
      return Result.err({ kind: "not_found" });
    }
    if (found.value === null) {
      return Result.err({ kind: "not_found" });
    }

    const updated = updateBadge(found.value, input.patch);

    const r = await this.deps.badgeRepo.update(updated);
    if (!r.ok) {
      if (r.error.kind === "not_found") {
        return Result.err({ kind: "not_found" });
      }
      if (r.error.kind === "db_error") {
        return Result.err({ kind: "db_error", message: r.error.message });
      }
      return Result.err({ kind: "db_error", message: "unknown" });
    }

    await this.deps.recordAuditLog.execute({
      actorId: input.actorId,
      action: "badge.updated",
      targetType: "badge",
      targetId: input.slug,
      metadata: {
        changedFields: Object.keys(input.patch),
      },
    });

    return Result.ok({ badge: r.value });
  }
}
