/**
 * AdminGetBadge — get a single badge by slug (admin view, includes archived).
 *
 * STORY-050e.
 */
import { Result } from "@/domain/shared/Result";
import type { IBadgeRepository } from "@/ports/repositories/IBadgeRepository";
import type { Badge, BadgeSlug } from "@/domain/entities/Badge";

export interface AdminGetBadgeDeps {
  badgeRepo: IBadgeRepository;
}

export type AdminGetBadgeError = { kind: "not_found" } | { kind: "db_error"; message: string };
export type AdminGetBadgeResult = Result<Badge, AdminGetBadgeError>;

export class AdminGetBadge {
  constructor(private readonly deps: AdminGetBadgeDeps) {}

  async execute(slug: BadgeSlug): Promise<AdminGetBadgeResult> {
    const r = await this.deps.badgeRepo.findBySlug(slug);
    if (!r.ok) {
      if (r.error.kind === "db_error") {
        return Result.err({ kind: "db_error", message: r.error.message });
      }
      return Result.err({ kind: "not_found" });
    }
    if (r.value === null) {
      return Result.err({ kind: "not_found" });
    }
    return Result.ok(r.value);
  }
}
