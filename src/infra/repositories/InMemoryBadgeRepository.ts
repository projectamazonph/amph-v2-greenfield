/**
 * InMemoryBadgeRepository — fast in-memory fake for tests.
 *
 * STORY-035: Badge system.
 * STORY-050e: Admin CRUD.
 */

import { Result } from "@/domain/shared/Result";
import type { IBadgeRepository, BadgeRepositoryError } from "@/ports/repositories/IBadgeRepository";
import type { Badge, BadgeSlug } from "@/domain/entities/Badge";

export class InMemoryBadgeRepository implements IBadgeRepository {
  private badges = new Map<BadgeSlug, Badge>();

  async findBySlug(slug: BadgeSlug): Promise<Result<Badge | null, BadgeRepositoryError>> {
    return { ok: true, value: this.badges.get(slug) ?? null };
  }

  async findAll(): Promise<Result<readonly Badge[], BadgeRepositoryError>> {
    return { ok: true, value: [...this.badges.values()] };
  }

  // ── STORY-050e: admin methods ─────────────────────────────────────────

  async create(badge: Badge): Promise<Result<Badge, BadgeRepositoryError>> {
    if (this.badges.has(badge.slug)) {
      return { ok: false, error: { kind: "slug_taken" } };
    }
    this.badges.set(badge.slug, badge);
    return { ok: true, value: badge };
  }

  async update(badge: Badge): Promise<Result<Badge, BadgeRepositoryError>> {
    if (!this.badges.has(badge.slug)) {
      return { ok: false, error: { kind: "not_found" } };
    }
    this.badges.set(badge.slug, badge);
    return { ok: true, value: badge };
  }

  async archive(slug: BadgeSlug): Promise<Result<void, BadgeRepositoryError>> {
    const existing = this.badges.get(slug);
    if (!existing) {
      return { ok: false, error: { kind: "not_found" } };
    }
    this.badges.set(slug, Object.freeze({ ...existing, archived: true }));
    return { ok: true, value: undefined };
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
