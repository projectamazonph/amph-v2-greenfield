/**
 * InMemoryProgressEventRepository — fast, synchronous test adapter for IProgressEventRepository.
 *
 * STORY-027: MarkLessonComplete use case + ProgressService + ProgressEvent log.
 */

import type {
  IProgressEventRepository,
  ProgressEventError,
} from "@/ports/repositories/IProgressEventRepository";
import type { ProgressEvent } from "@/domain/entities/ProgressEvent";
import { Result } from "@/domain/shared/Result";

export class InMemoryProgressEventRepository implements IProgressEventRepository {
  private events: ProgressEvent[] = [];

  async create(event: ProgressEvent): Promise<Result<ProgressEvent, ProgressEventError>> {
    this.events.push(Object.freeze({ ...event }));
    return Result.ok(event);
  }

  async findByUserId(
    userId: string,
  ): Promise<Result<readonly ProgressEvent[], ProgressEventError>> {
    const filtered = this.events
      .filter((e) => e.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return Result.ok(filtered);
  }

  async findByCourseId(
    courseId: string,
  ): Promise<Result<readonly ProgressEvent[], ProgressEventError>> {
    const filtered = this.events
      .filter((e) => e.courseId === courseId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return Result.ok(filtered);
  }

  /** Remove all events. Call between tests. */
  clear(): void {
    this.events = [];
  }

  /** Pre-seed a progress event. */
  seed(event: ProgressEvent): void {
    this.events.push(Object.freeze({ ...event }));
  }
}
