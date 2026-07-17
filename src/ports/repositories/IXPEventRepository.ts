/**
 * IXPEventRepository — port for persisting XP events.
 *
 * STORY-028: XPService + XP display on dashboard.
 */

import { Result } from "@/domain/shared/Result";
import type { XPEvent, XPEventError } from "@/domain/entities/XPEvent";

export interface IXPEventRepository {
  /**
   * Persist an XP event. Returns the created event on success.
   */
  create(event: XPEvent): Promise<Result<XPEvent, XPEventError>>;

  /**
   * Find all XP events for a user, newest first.
   */
  findByUserId(userId: string): Promise<Result<readonly XPEvent[], XPEventError>>;
}
