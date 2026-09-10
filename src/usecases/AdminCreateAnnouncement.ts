/**
 * AdminCreateAnnouncement — admin creates a new site-wide banner.
 *
 * P1-07 (P4 PR-A). Validates the draft, persists it, writes an
 * audit log entry on success.
 */

import { Result } from "@/domain/shared/Result";
import {
  validateAnnouncementDraft,
  type AnnouncementValidationError,
} from "@/domain/entities/Announcement";
import type {
  IAnnouncementRepository,
  CreateAnnouncementInput,
  AnnouncementError,
} from "@/ports/repositories/IAnnouncementRepository";
import type { IdGenerator } from "@/ports/system/IdGenerator";
import type { Clock } from "@/ports/system/Clock";
import { RecordAuditLog } from "@/usecases/RecordAuditLog";

export type AdminCreateAnnouncementError =
  | AnnouncementValidationError
  | AnnouncementError;

export interface AdminCreateAnnouncementInput {
  title: string;
  body: string;
  level: string;
  isActive?: boolean;
  startsAt?: Date | null;
  endsAt?: Date | null;
  dismissible?: boolean;
  actorId: string;
}

export class AdminCreateAnnouncement {
  constructor(
    private readonly deps: {
      announcementRepo: IAnnouncementRepository;
      idGen: IdGenerator;
      clock: Clock;
      recordAuditLog: RecordAuditLog;
    },
  ) {}

  async execute(
    input: AdminCreateAnnouncementInput,
  ): Promise<Result<{ announcementId: string }, AdminCreateAnnouncementError>> {
    const validated = validateAnnouncementDraft(input);
    if (!validated.ok) {
      void this.deps.recordAuditLog.execute({
        actorId: input.actorId,
        action: "announcement.create_failed",
        targetId: this.deps.idGen.newId(),
        targetType: "announcement",
        metadata: { error: validated.error.kind },
      });
      return Result.err(validated.error);
    }

    const draft: CreateAnnouncementInput = {
      title: validated.value.title,
      body: validated.value.body,
      level: validated.value.level,
      isActive: validated.value.isActive,
      startsAt: validated.value.startsAt,
      endsAt: validated.value.endsAt,
      dismissible: validated.value.dismissible,
    };

    const created = await this.deps.announcementRepo.create(draft, {
      id: input.actorId,
    });
    if (!created.ok) {
      void this.deps.recordAuditLog.execute({
        actorId: input.actorId,
        action: "announcement.create_failed",
        targetId: this.deps.idGen.newId(),
        targetType: "announcement",
        metadata: { error: created.error.kind },
      });
      return Result.err(created.error);
    }

    void this.deps.recordAuditLog.execute({
      actorId: input.actorId,
      action: "announcement.created",
      targetId: created.value.id,
      targetType: "announcement",
      metadata: {
        level: created.value.level,
        isActive: created.value.isActive,
      },
    });

    return Result.ok({ announcementId: created.value.id });
  }
}
