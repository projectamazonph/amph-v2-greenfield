/**
 * IBadgeRepository — port for badge template CRUD.
 *
 * STORY-035: Badge system.
 *
 * Badges are templates created by admins (out of scope for this story).
 * This port provides read access to the badge catalog.
 */

import { Result } from "@/domain/shared/Result";
import type { Badge, BadgeSlug } from "@/domain/entities/Badge";

export type BadgeError = { kind: "db_error"; message: string };

export interface IBadgeRepository {
  /**
   * Find a badge by its slug (primary key).
   * Returns null if no badge with that slug exists.
   */
  findBySlug(slug: BadgeSlug): Promise<Result<Badge | null, BadgeError>>;

  /**
   * List all available badge templates.
   */
  findAll(): Promise<Result<readonly Badge[], BadgeError>>;
}
