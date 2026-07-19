/**
 * AdminCreateBadge — create a new badge template.
 *
 * STORY-050e. Calls recordAuditLog on success/failure.
 */
import { Result } from "@/domain/shared/Result";
import type { IBadgeRepository } from "@/ports/repositories/IBadgeRepository";
import type { RecordAuditLog } from "@/usecases/RecordAuditLog";
import { createBadge, type Badge, type BadgeError } from "@/domain/entities/Badge";

export interface AdminCreateBadgeInput {
  slug: string;
  name: string;
  description: string;
  iconName: string;
  xpReward: number;
  actorId: string;
}

export interface AdminCreateBadgeDeps {
  badgeRepo: IBadgeRepository;
  recordAuditLog: RecordAuditLog;
}

export type AdminCreateBadgeError =
  | { kind: "invalid_slug" }
  | { kind: "slug_taken" }
  | { kind: "db_error"; message: string };
export type AdminCreateBadgeResult = Result<{ badge: Badge }, AdminCreateBadgeError>;

export class AdminCreateBadge {
  constructor(private readonly deps: AdminCreateBadgeDeps) {}

  async execute(input: AdminCreateBadgeInput): Promise<AdminCreateBadgeResult> {
    const built = createBadge(input);
    if (!built.ok) {
      const e: BadgeError = built.error;
      if (e.kind === "invalid_slug") {
        await this.deps.recordAuditLog.execute({
          actorId: input.actorId,
          action: "badge.create_failed",
          targetType: "badge",
          targetId: input.slug,
          metadata: { reason: "invalid_slug" },
        });
        return Result.err({ kind: "invalid_slug" });
      }
      return Result.err({ kind: "invalid_slug" });
    }

    const badge = built.value;
    const r = await this.deps.badgeRepo.create(badge);
    if (!r.ok) {
      if (r.error.kind === "slug_taken") {
        await this.deps.recordAuditLog.execute({
          actorId: input.actorId,
          action: "badge.create_failed",
          targetType: "badge",
          targetId: badge.slug,
          metadata: { reason: "slug_taken" },
        });
        return Result.err({ kind: "slug_taken" });
      }
      if (r.error.kind === "db_error") {
        await this.deps.recordAuditLog.execute({
          actorId: input.actorId,
          action: "badge.create_failed",
          targetType: "badge",
          targetId: badge.slug,
          metadata: { reason: "db_error", message: r.error.message },
        });
        return Result.err({ kind: "db_error", message: r.error.message });
      }
      return Result.err({ kind: "db_error", message: "unknown" });
    }

    await this.deps.recordAuditLog.execute({
      actorId: input.actorId,
      action: "badge.created",
      targetType: "badge",
      targetId: badge.slug,
      metadata: { name: badge.name, xpReward: badge.xpReward },
    });

    return Result.ok({ badge: r.value });
  }
}
