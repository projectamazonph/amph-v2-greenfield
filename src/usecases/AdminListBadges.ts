/**
 * AdminListBadges — list all badge templates (admin view, includes archived).
 *
 * STORY-050e.
 */
import { Result } from "@/domain/shared/Result";
import type { IBadgeRepository } from "@/ports/repositories/IBadgeRepository";
import type { Badge } from "@/domain/entities/Badge";

export interface AdminListBadgesDeps {
  badgeRepo: IBadgeRepository;
}

export type AdminListBadgesError = { kind: "db_error"; message: string };
export type AdminListBadgesResult = Result<readonly Badge[], AdminListBadgesError>;

export class AdminListBadges {
  constructor(private readonly deps: AdminListBadgesDeps) {}

  async execute(): Promise<AdminListBadgesResult> {
    const r = await this.deps.badgeRepo.findAll();
    if (!r.ok) {
      if (r.error.kind === "db_error") {
        return Result.err({ kind: "db_error", message: r.error.message });
      }
      // The readonly findAll signature returns Badge | null as well; the admin path treats it as empty
      return Result.ok([]);
    }
    return Result.ok(r.value);
  }
}
