import { Result } from "@/domain/shared/Result";
import type { LiveClass } from "@/domain/entities/LiveClass";
import type { LiveClassRegistration } from "@/domain/entities/LiveClassRegistration";
import type { ILiveClassRepository } from "@/ports/repositories/ILiveClassRepository";
import type { ILiveClassRegistrationRepository } from "@/ports/repositories/ILiveClassRegistrationRepository";
import type { IEnrollmentRepository } from "@/ports/repositories/IEnrollmentRepository";

/**
 * `ListLiveClassesForStudent` — STORY-090.
 *
 * Returns the list of upcoming live classes for a student.
 * Combines three ports:
 *   - LiveClassRepository for class metadata
 *   - LiveClassRegistrationRepository for which ones the user RSVP'd to
 *   - EnrollmentRepository to determine which courses the student is enrolled in
 *
 * Order: nearest scheduledAt first. Past (completed/cancelled) classes are excluded.
 * For enrolled students only — guest users see `not_enrolled`.
 */

export type ListLiveClassesForStudentError =
  | { kind: "not_enrolled"; courseIds: string[] }
  | { kind: "db_error"; message: string };

export interface ListLiveClassesForStudentInput {
  userId: string;
}

export interface LiveClassWithRsvp {
  readonly liveClass: LiveClass;
  readonly registration: LiveClassRegistration | null;
}

export interface ListLiveClassesForStudentDeps {
  liveClassRepo: ILiveClassRepository;
  liveClassRegistrationRepo: ILiveClassRegistrationRepository;
  enrollmentRepo: IEnrollmentRepository;
  /** Override `Date.now()` and `new Date()` for tests. */
  now?: () => Date;
}

export class ListLiveClassesForStudent {
  constructor(private readonly deps: ListLiveClassesForStudentDeps) {}

  async execute(
    input: ListLiveClassesForStudentInput,
  ): Promise<Result<LiveClassWithRsvp[], ListLiveClassesForStudentError>> {
    if (!input.userId.trim()) {
      return Result.err({ kind: "not_enrolled", courseIds: [] });
    }

    // ── Read enrollments for the student ─────────────────────
    const enrollmentResult = await this.deps.enrollmentRepo.findByUserId(
      input.userId,
    );
    if (!enrollmentResult.ok) {
      return Result.err({
        kind: "db_error",
        message:
          enrollmentResult.error.kind === "db_error"
            ? enrollmentResult.error.message
            : "enrollments lookup failed",
      });
    }
    const activeCourses = enrollmentResult.value
      .filter((e) => e.status === "active")
      .map((e) => e.courseId);
    const enrolledSet = new Set(activeCourses);

    // ── List all live classes ─────────────────────────────────
    const classesResult = await this.deps.liveClassRepo.listAll();
    if (!classesResult.ok) {
      return Result.err({
        kind: "db_error",
        message:
          classesResult.error.kind === "db_error"
            ? classesResult.error.message
            : "classes lookup failed",
      });
    }

    const now = (this.deps.now ?? (() => new Date()))();
    const filtered = classesResult.value.filter(
      (lc) =>
        lc.status !== "cancelled" &&
        lc.status !== "completed" &&
        lc.scheduledAt.getTime() > now.getTime() &&
        enrolledSet.has(lc.courseId),
    );
    filtered.sort(
      (a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime(),
    );

    // ── Read current RSVP for the user in a single pass ───────
    const regsResult = await this.deps.liveClassRegistrationRepo.listByUser(
      input.userId,
    );
    if (!regsResult.ok) {
      return Result.err({
        kind: "db_error",
        message: "registrations lookup failed",
      });
    }
    const byClass = new Map<string, LiveClassRegistration>();
    for (const r of regsResult.value) {
      byClass.set(r.liveClassId, r);
    }

    return Result.ok(
      filtered.map((lc) => ({
        liveClass: lc,
        registration: byClass.get(lc.id) ?? null,
      })),
    );
  }
}