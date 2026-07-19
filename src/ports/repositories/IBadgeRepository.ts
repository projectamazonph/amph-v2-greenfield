/**
 * IBadgeRepository — port for badge template CRUD.
 *
 * STORY-035: Badge system (read access).
 * STORY-050e: Admin CRUD (create, update, archive).
 */

import { Result } from "@/domain/shared/Result";
import type { Badge, BadgeSlug } from "@/domain/entities/Badge";

export type BadgeRepositoryError =
  | { kind: "db_error"; message: string }
  | { kind: "not_found" }
  | { kind: "slug_taken" };

export interface IBadgeRepository {
  /**
   * Find a badge by its slug (primary key).
   * Returns null if no badge with that slug exists.
   */
  findBySlug(slug: BadgeSlug): Promise<Result<Badge | null, BadgeRepositoryError>>;

  /**
   * List all available badge templates (including archived by default for admin).
   */
  findAll(): Promise<Result<readonly Badge[], BadgeRepositoryError>>;

  // ── STORY-050e: admin methods ───────────────────────────────────────────

  /**
   * Create a new badge template. Returns slug_taken if the slug already exists.
   */
  create(badge: Badge): Promise<Result<Badge, BadgeRepositoryError>>;

  /**
   * Update an existing badge template. Returns not_found if the slug doesn't exist.
   */
  update(badge: Badge): Promise<Result<Badge, BadgeRepositoryError>>;

  /**
   * Archive a badge (sets archived=true). Idempotent.
   */
  archive(slug: BadgeSlug): Promise<Result<void, BadgeRepositoryError>>;
}
