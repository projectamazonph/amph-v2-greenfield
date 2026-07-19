/**
 * `CreateLiveClass` — create a new live class.
 *
 * STORY-050c.
 */
import { Result } from "@/domain/shared/Result";
import {
  createLiveClass,
  type CreateLiveClassInput,
  type LiveClassError,
} from "@/domain/entities/LiveClass";
import type {
  ILiveClassRepository,
  LiveClassRepositoryError,
} from "@/ports/repositories/ILiveClassRepository";
import { RecordAuditLog } from "@/usecases/RecordAuditLog";

export interface CreateLiveClassInput_ {
  id: string;
  courseId: string;
  title: string;
  scheduledAt: Date;
  durationMinutes: number;
  instructorId: string;
  meetingUrl: string;
  actorId: string;
}

export type CreateLiveClassResult = Result<
  { liveClassId: string },
  LiveClassError | LiveClassRepositoryError
>;

export class CreateLiveClass {
  constructor(
    private readonly deps: {
      liveClassRepo: ILiveClassRepository;
      recordAuditLog: RecordAuditLog;
    },
  ) {}

  async execute(
    input: CreateLiveClassInput_,
  ): Promise<CreateLiveClassResult> {
    const liveClassResult = createLiveClass({
      id: input.id,
      courseId: input.courseId,
      title: input.title,
      scheduledAt: input.scheduledAt,
      durationMinutes: input.durationMinutes,
      instructorId: input.instructorId,
      meetingUrl: input.meetingUrl,
      status: "scheduled",
    });

    if (!liveClassResult.ok) {
      void this.deps.recordAuditLog.execute({
        actorId: input.actorId,
        action: "live_class.create_failed",
        targetId: input.id,
        targetType: "live_class",
        metadata: { error: liveClassResult.error.kind },
      });
      return liveClassResult as unknown as CreateLiveClassResult;
    }

    const persistResult = await this.deps.liveClassRepo.create(
      liveClassResult.value,
    );

    if (!persistResult.ok) {
      void this.deps.recordAuditLog.execute({
        actorId: input.actorId,
        action: "live_class.create_failed",
        targetId: input.id,
        targetType: "live_class",
        metadata: {
          error: persistResult.error.kind === "db_error"
            ? persistResult.error.message
            : persistResult.error.kind,
        },
      });
      return persistResult as unknown as CreateLiveClassResult;
    }

    void this.deps.recordAuditLog.execute({
      actorId: input.actorId,
      action: "live_class.created",
      targetId: input.id,
      targetType: "live_class",
      metadata: {
        courseId: input.courseId,
        title: input.title,
        scheduledAt: input.scheduledAt.toISOString(),
      },
    });

    return { ok: true, value: { liveClassId: input.id } };
  }
}
