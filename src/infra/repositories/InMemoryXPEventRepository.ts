/**
 * InMemoryXPEventRepository — a fast, synchronous fake for unit tests.
 *
 * STORY-028: XPService + XP display on dashboard.
 */

import { Result } from "@/domain/shared/Result";
import type { IXPEventRepository } from "@/ports/repositories/IXPEventRepository";
import type { XPEvent, XPEventError } from "@/domain/entities/XPEvent";

export class InMemoryXPEventRepository implements IXPEventRepository {
  private events = new Map<string, XPEvent>();

  async create(event: XPEvent): Promise<Result<XPEvent, XPEventError>> {
    this.events.set(event.id, event);
    return Result.ok(event);
  }

  async findByUserId(userId: string): Promise<Result<readonly XPEvent[], XPEventError>> {
    const events = [...this.events.values()]
      .filter((e) => e.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return Result.ok(events);
  }

  /** Remove all events. Call between tests. */
  clear(): void {
    this.events.clear();
  }
}
