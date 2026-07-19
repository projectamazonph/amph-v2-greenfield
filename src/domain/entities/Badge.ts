/**
 * Badge — a badge template.
 *
 * STORY-035: Badge system.
 * STORY-050e: Admin CRUD + factory updates.
 *
 * A Badge is a template (e.g. "First Quiz Pass"). A BadgeAward is the
 * per-user award record linking a user to a badge at a specific time.
 * See BadgeAward.ts.
 */

import { Result } from "@/domain/shared/Result";

// ── Types ───────────────────────────────────────────────────────────────────

export type BadgeSlug = "first-quiz-pass" | "5-day-streak" | "all-3-courses-enrolled";

export interface Badge {
  readonly slug: BadgeSlug;
  readonly name: string;
  readonly description: string;
  readonly iconName: string; // Phosphor icon name, e.g. "Trophy"
  readonly xpReward: number;
  readonly archived: boolean; // STORY-050e
}

export type BadgeError = { kind: "invalid_slug" };

// ── Factory ────────────────────────────────────────────────────────────────

const VALID_SLUGS: readonly BadgeSlug[] = [
  "first-quiz-pass",
  "5-day-streak",
  "all-3-courses-enrolled",
] as const;

export function createBadge(params: {
  slug: string;
  name: string;
  description: string;
  iconName: string;
  xpReward: number;
}): Result<Badge, BadgeError> {
  if (!VALID_SLUGS.includes(params.slug as BadgeSlug)) {
    return Result.err({ kind: "invalid_slug" });
  }

  return Result.ok(
    Object.freeze({
      slug: params.slug as BadgeSlug,
      name: params.name.trim(),
      description: params.description.trim(),
      iconName: params.iconName.trim(),
      xpReward: params.xpReward,
      archived: false,
    }),
  );
}

/**
 * updateBadge — immutable factory; returns a new frozen Badge.
 * STORY-050e.
 */
export function updateBadge(
  current: Badge,
  patch: {
    name?: string;
    description?: string;
    iconName?: string;
    xpReward?: number;
    archived?: boolean;
  },
): Badge {
  return Object.freeze({
    slug: current.slug,
    name: patch.name !== undefined ? patch.name.trim() : current.name,
    description: patch.description !== undefined ? patch.description.trim() : current.description,
    iconName: patch.iconName !== undefined ? patch.iconName.trim() : current.iconName,
    xpReward: patch.xpReward !== undefined ? patch.xpReward : current.xpReward,
    archived: patch.archived !== undefined ? patch.archived : current.archived,
  });
}
