/**
 * Announcement — a site-wide banner shown at the top of every page.
 *
 * P1-07 (P4 PR-A). Immutable domain object. Rows are authored by
 * admins and read anonymously (or per-user, when a session exists).
 *
 * Visibility is a pure function of the row plus "now":
 *   isActive && startsAt <= now && (endsAt == null || endsAt > now)
 *
 * `startsAt = null` means "visible from the moment it is activated".
 * `endsAt = null` means "no expiry". `endsAt` is exclusive: an
 * announcement whose window closes exactly at `now` is already hidden.
 */

import { Result } from "@/domain/shared/Result";

export type AnnouncementLevel = "INFO" | "WARNING" | "CRITICAL";

const LEVELS: readonly AnnouncementLevel[] = ["INFO", "WARNING", "CRITICAL"];

/** Narrowing guard for the persisted `level` column (a plain String). */
export function isAnnouncementLevel(value: string): value is AnnouncementLevel {
  return (LEVELS as readonly string[]).includes(value);
}

export interface Announcement {
  readonly id: string;
  readonly title: string;
  readonly body: string;
  readonly level: AnnouncementLevel;
  readonly isActive: boolean;
  /** null = visible as soon as it is active. */
  readonly startsAt: Date | null;
  /** null = never expires. Exclusive bound. */
  readonly endsAt: Date | null;
  readonly dismissible: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly createdById: string | null;
  readonly updatedById: string | null;
  /** True iff active and `date` falls inside the [startsAt, endsAt) window. */
  isVisibleAt(date: Date): boolean;
}

export type AnnouncementValidationError =
  | { kind: "invalid_title"; message: string }
  | { kind: "invalid_body"; message: string }
  | { kind: "invalid_level"; message: string }
  | { kind: "invalid_window"; message: string };

/** The admin-editable shape, before persistence. */
export interface AnnouncementDraft {
  title: string;
  body: string;
  level: AnnouncementLevel;
  isActive: boolean;
  startsAt: Date | null;
  endsAt: Date | null;
  dismissible: boolean;
}

const MAX_TITLE = 120;

/**
 * Validate and normalize an admin-supplied draft. Trims the text
 * fields so a whitespace-only title is rejected rather than stored.
 */
export function validateAnnouncementDraft(input: {
  title: string;
  body: string;
  level: string;
  isActive?: boolean;
  startsAt?: Date | null;
  endsAt?: Date | null;
  dismissible?: boolean;
}): Result<AnnouncementDraft, AnnouncementValidationError> {
  const title = input.title.trim();
  if (!title) {
    return Result.err({ kind: "invalid_title", message: "Title cannot be empty." });
  }
  if (title.length > MAX_TITLE) {
    return Result.err({
      kind: "invalid_title",
      message: `Title cannot be longer than ${MAX_TITLE} characters.`,
    });
  }

  const body = input.body.trim();
  if (!body) {
    return Result.err({ kind: "invalid_body", message: "Body cannot be empty." });
  }

  if (!isAnnouncementLevel(input.level)) {
    return Result.err({
      kind: "invalid_level",
      message: "Level must be INFO, WARNING, or CRITICAL.",
    });
  }

  const startsAt = input.startsAt ?? null;
  const endsAt = input.endsAt ?? null;
  if (startsAt !== null && endsAt !== null && endsAt <= startsAt) {
    return Result.err({
      kind: "invalid_window",
      message: "End time must be after the start time.",
    });
  }

  return Result.ok({
    title,
    body,
    level: input.level,
    isActive: input.isActive ?? false,
    startsAt,
    endsAt,
    dismissible: input.dismissible ?? true,
  });
}

/**
 * Is this announcement visible at `date`?
 *
 * Exposed as a free function so repositories and tests can reason
 * about a plain row; the entity method delegates here.
 */
export function announcementIsVisibleAt(
  a: Pick<Announcement, "isActive" | "startsAt" | "endsAt">,
  date: Date,
): boolean {
  if (!a.isActive) return false;
  if (a.startsAt !== null && a.startsAt.getTime() > date.getTime()) return false;
  if (a.endsAt !== null && a.endsAt.getTime() <= date.getTime()) return false;
  return true;
}

export interface AnnouncementFields {
  id: string;
  title: string;
  body: string;
  level: AnnouncementLevel;
  isActive: boolean;
  startsAt: Date | null;
  endsAt: Date | null;
  dismissible: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdById: string | null;
  updatedById: string | null;
}

/**
 * Build a frozen Announcement from already-valid fields.
 *
 * Repositories use this to hydrate persisted rows. Callers that
 * accept untrusted input must run `validateAnnouncementDraft` first.
 */
export function hydrateAnnouncement(fields: AnnouncementFields): Announcement {
  const entity: Announcement = {
    id: fields.id,
    title: fields.title,
    body: fields.body,
    level: fields.level,
    isActive: fields.isActive,
    startsAt: fields.startsAt,
    endsAt: fields.endsAt,
    dismissible: fields.dismissible,
    createdAt: fields.createdAt,
    updatedAt: fields.updatedAt,
    createdById: fields.createdById,
    updatedById: fields.updatedById,
    isVisibleAt(date: Date): boolean {
      return announcementIsVisibleAt(entity, date);
    },
  };
  return Object.freeze(entity);
}

/**
 * Create a validated Announcement entity. Used by the in-memory fake
 * and by tests; the Prisma adapter lets the database assign `id`,
 * `createdAt`, and `updatedAt` and then hydrates the returned row.
 */
export function createAnnouncement(params: {
  id: string;
  title: string;
  body: string;
  level: string;
  isActive?: boolean;
  startsAt?: Date | null;
  endsAt?: Date | null;
  dismissible?: boolean;
  createdAt: Date;
  updatedAt?: Date;
  createdById?: string | null;
  updatedById?: string | null;
}): Result<Announcement, AnnouncementValidationError> {
  const draft = validateAnnouncementDraft(params);
  if (!draft.ok) return draft;

  return Result.ok(
    hydrateAnnouncement({
      id: params.id,
      title: draft.value.title,
      body: draft.value.body,
      level: draft.value.level,
      isActive: draft.value.isActive,
      startsAt: draft.value.startsAt,
      endsAt: draft.value.endsAt,
      dismissible: draft.value.dismissible,
      createdAt: params.createdAt,
      updatedAt: params.updatedAt ?? params.createdAt,
      createdById: params.createdById ?? null,
      updatedById: params.updatedById ?? null,
    }),
  );
}
