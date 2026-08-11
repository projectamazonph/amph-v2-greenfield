import { Result } from "@/domain/shared/Result";
import {
  createLiveClassRegistration,
  type LiveClassRegistration,
} from "@/domain/entities/LiveClassRegistration";
import type { LiveClass, LiveClassStatus } from "@/domain/entities/LiveClass";
import type { ILiveClassRepository } from "@/ports/repositories/ILiveClassRepository";
import type { ILiveClassRegistrationRepository } from "@/ports/repositories/ILiveClassRegistrationRepository";
import type { IdGenerator } from "@/ports/system/IdGenerator";
import type { Clock } from "@/ports/system/Clock";
import type { IEnrollmentRepository } from "@/ports/repositories/IEnrollmentRepository";

/**
 * `RsvpLiveClass` — STORY-091.
 *
 * Registers the current user for the given live class.
 * Rejects duplicate registrations and registrations for cancelled /
 * completed classes. Idempotent in the sense that re-registering after
 * a cancel transitions back to "registered".
 */

export type RsvpLiveClassError =
  | { kind: "not_found"; liveClassId: string }
  | { kind: "class_cancelled_or_completed"; status: LiveClassStatus }
  | { kind: "course_access_required" }
  | { kind: "already_registered" }
  | { kind: "db_error"; message: string };

export interface RsvpLiveClassInput {
  userId: string;
  liveClassId: string;
}

export interface RsvpLiveClassDeps {
  liveClassRepo: ILiveClassRepository;
  liveClassRegistrationRepo: ILiveClassRegistrationRepository;
  enrollmentRepo: IEnrollmentRepository;
  ids: IdGenerator;
  clock: Clock;
}

export class RsvpLiveClass {
  constructor(private readonly deps: RsvpLiveClassDeps) {}

  async execute(
    input: RsvpLiveClassInput,
  ): Promise<Result<LiveClassRegistration, RsvpLiveClassError>> {
    // 1. Validate class exists and is RSVP-able.
    const classResult = await this.deps.liveClassRepo.findById(input.liveClassId);
    if (!classResult.ok) {
      return Result.err({
        kind: "db_error",
        message: "class lookup failed",
      });
    }
    const liveClass: LiveClass | null = classResult.value;
    if (!liveClass) {
      return Result.err({
        kind: "not_found",
        liveClassId: input.liveClassId,
      });
    }
    if (liveClass.status === "cancelled" || liveClass.status === "completed") {
      return Result.err({
        kind: "class_cancelled_or_completed",
        status: liveClass.status,
      });
    }

    const enrollment = await this.deps.enrollmentRepo.findByUserIdAndCourseId(
      input.userId,
      liveClass.courseId,
    );
    if (!enrollment || enrollment.status !== "active") {
      return Result.err({ kind: "course_access_required" });
    }

    // 2. Existing RSVP?
    const existingResult = await this.deps.liveClassRegistrationRepo.findByUserAndClass(
      input.userId,
      input.liveClassId,
    );
    if (!existingResult.ok) {
      return Result.err({
        kind: "db_error",
        message: "existing registration lookup failed",
      });
    }
    const existing = existingResult.value;
    const now = this.deps.clock.now();
    if (existing) {
      if (existing.status === "registered") {
        // Already RSVP'd — return the existing row (idempotent).
        return Result.ok(existing);
      }
      // existing.status === "cancelled" — flip back to registered.
      const reRegistered: LiveClassRegistration = {
        ...existing,
        status: "registered",
        cancelledAt: null,
        registeredAt: existing.registeredAt ?? now,
        updatedAt: now,
      };
      const upd = await this.deps.liveClassRegistrationRepo.update(reRegistered);
      if (!upd.ok) {
        return Result.err({
          kind: "db_error",
          message: "reregister failed",
        });
      }
      return Result.ok(reRegistered);
    }

    // 3. Create a new registration row.
    const regInput = {
      id: this.deps.ids.newId(),
      userId: input.userId,
      liveClassId: input.liveClassId,
    };
    const createdResult = createLiveClassRegistration(regInput);
    if (!createdResult.ok) {
      return Result.err({ kind: "db_error", message: "creation validation failed" });
    }
    const registration: LiveClassRegistration = {
      ...createdResult.value,
      registeredAt: now,
      createdAt: now,
      updatedAt: now,
    };
    const createResult = await this.deps.liveClassRegistrationRepo.create(registration);
    if (!createResult.ok) {
      if (createResult.error.kind === "already_registered") {
        return Result.err({ kind: "already_registered" });
      }
      return Result.err({
        kind: "db_error",
        message: "create failed",
      });
    }
    return Result.ok(registration);
  }
}
