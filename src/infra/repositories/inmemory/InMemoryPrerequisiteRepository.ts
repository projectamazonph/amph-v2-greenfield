/**
 * InMemoryPrerequisiteRepository — test fake for IPrerequisiteRepository.
 *
 * P1-01 (PR-C slice 1). Stores Prerequisite entities in a Map, keyed by
 * id. Mirrors the Prisma adapter's contracts: triple uniqueness on
 * create, soft-deleted rows invisible to findRule and listByCourseId,
 * and not_found on updating a missing id.
 */

import { Result } from "@/domain/shared/Result";
import type { Prerequisite } from "@/domain/entities/Prerequisite";
import type {
  IPrerequisiteRepository,
  PrerequisiteQueryError,
  PrerequisiteRepoError,
} from "@/ports/repositories/IPrerequisiteRepository";

function sameTriple(a: Prerequisite, courseId: string, requiresCourseId: string, requiresLessonId: string | null): boolean {
  return (
    a.courseId === courseId &&
    a.requiresCourseId === requiresCourseId &&
    a.requiresLessonId === requiresLessonId
  );
}

export class InMemoryPrerequisiteRepository implements IPrerequisiteRepository {
  private readonly rows = new Map<string, Prerequisite>();

  async create(prereq: Prerequisite): Promise<Result<Prerequisite, PrerequisiteQueryError>> {
    for (const existing of this.rows.values()) {
      if (existing.id === prereq.id) {
        return Result.err({
          kind: "db_error",
          message: `Unique constraint failed on id: ${prereq.id}`,
        });
      }
      if (
        existing.deletedAt === null &&
        sameTriple(existing, prereq.courseId, prereq.requiresCourseId, prereq.requiresLessonId)
      ) {
        return Result.err({
          kind: "db_error",
          message: `Unique constraint failed on prerequisite triple: ${prereq.courseId}`,
        });
      }
    }
    this.rows.set(prereq.id, prereq);
    return Result.ok(prereq);
  }

  async findRule(
    courseId: string,
    requiresCourseId: string,
    requiresLessonId: string | null,
  ): Promise<Result<Prerequisite | null, PrerequisiteQueryError>> {
    for (const prereq of this.rows.values()) {
      if (
        prereq.deletedAt === null &&
        sameTriple(prereq, courseId, requiresCourseId, requiresLessonId)
      ) {
        return Result.ok(prereq);
      }
    }
    return Result.ok(null);
  }

  async listByCourseId(courseId: string): Promise<Result<readonly Prerequisite[], PrerequisiteQueryError>> {
    const rules = Array.from(this.rows.values())
      .filter((prereq) => prereq.courseId === courseId && prereq.deletedAt === null)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    return Result.ok(rules);
  }

  async update(prereq: Prerequisite): Promise<Result<Prerequisite, PrerequisiteRepoError>> {
    if (!this.rows.has(prereq.id)) return Result.err({ kind: "not_found" });
    this.rows.set(prereq.id, prereq);
    return Result.ok(prereq);
  }

  /** Test helper: seed a rule directly, bypassing the port. */
  seed(prereq: Prerequisite): void {
    this.rows.set(prereq.id, prereq);
  }

  /** Test helper: clear all rows. */
  clear(): void {
    this.rows.clear();
  }
}
