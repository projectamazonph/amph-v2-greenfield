/**
 * IAnnouncementRepository — port for persisting and querying
 * site-wide announcements.
 *
 * P1-07 (P4 PR-A). Multi-row list pattern (see IDiscountCodeRepository):
 * `listAll()` is the admin view (includes inactive rows), `listActive()`
 * is the public view filtered to the rows visible at a given instant.
 *
 * ADR-014: every port method returns Result<T, E>. No exceptions
 * across boundaries.
 */

import type { Result } from "@/domain/shared/Result";
import type { Announcement, AnnouncementLevel } from "@/domain/entities/Announcement";

export type AnnouncementError =
  | { kind: "not_found" }
  | { kind: "db_error"; message: string };

export interface CreateAnnouncementInput {
  title: string;
  body: string;
  level: AnnouncementLevel;
  isActive: boolean;
  startsAt: Date | null;
  endsAt: Date | null;
  dismissible: boolean;
}

export type UpdateAnnouncementInput = Partial<CreateAnnouncementInput>;

export interface IAnnouncementRepository {
  /**
   * Every non-deleted announcement visible at `now`, newest first.
   * This is the query the banner uses on every page render.
   */
  listActive(now: Date): Promise<Result<readonly Announcement[], AnnouncementError>>;

  /** Single announcement by id, or null when it does not exist. */
  findById(id: string): Promise<Result<Announcement | null, AnnouncementError>>;

  create(
    input: CreateAnnouncementInput,
    actor: { id: string },
  ): Promise<Result<Announcement, AnnouncementError>>;

  update(
    id: string,
    input: UpdateAnnouncementInput,
    actor: { id: string },
  ): Promise<Result<Announcement, AnnouncementError>>;

  /** Flip the kill switch on a single announcement. */
  setActive(
    id: string,
    active: boolean,
    actor: { id: string },
  ): Promise<Result<Announcement, AnnouncementError>>;

  /** Admin view: every non-deleted row regardless of window or state. */
  listAll(): Promise<Result<readonly Announcement[], AnnouncementError>>;
}
