/**
 * InMemoryBadgeRepository — fast in-memory fake for tests.
 *
 * STORY-035: Badge system.
 */

import { Result } from "@/domain/shared/Result";
import type { IBadgeRepository } from "@/ports/repositories/IBadgeRepository";
import type { Badge, BadgeSlug } from "@/domain/entities/Badge";

export class InMemoryBadgeRepository implements IBadgeRepository {
  private badges = new Map<BadgeSlug, Badge>();

  async findBySlug(slug: BadgeSlug): Promise<Result<Badge | null, never>> {
    return { ok: true, value: this.badges.get(slug) ?? null };
  }

  async findAll(): Promise<Result<readonly Badge[], never>> {
    return { ok: true, value: [...this.badges.values()] };
  }

  /** Add a badge to the store. Call between tests. */
  seed(badge: Badge): void {
    this.badges.set(badge.slug, badge);
  }

  /** Clear all badges. Call between tests. */
  clear(): void {
    this.badges.clear();
  }
}
