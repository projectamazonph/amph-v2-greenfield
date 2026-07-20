/**
 * SendLiveClassReminders use case — P0-7.
 *
 * Sends "your class is starting in N minutes" emails to every
 * student enrolled in a course with an upcoming live class.
 *
 * Designed to be called by a cron job every 5 minutes:
 *
 *   // /api/cron/live-class-reminders
 *   await sendLiveClassReminders.execute();
 *
 * The cron entry point is a thin route handler that delegates here.
 *
 * Window:
 *   The default window is 60 minutes. We treat any class whose
 *   scheduledAt is between `now` and `now + window` as "upcoming".
 *   Classes that have already started are excluded (no one wants
 *   "your class is starting in 30 minutes" 5 minutes after it began).
 *
 * Errors:
 *   - repo_error: a downstream call (liveClassRepo, enrollmentRepo,
 *     userRepo) failed
 *
 * Idempotency:
 *   This use case is NOT idempotent. If the cron runs twice in the
 *   same window, students get duplicate emails. The proper fix is a
 *   `SentReminder` log table keyed on (liveClassId, userId) — track
 *   that as a follow-up. For P0-7 we accept the simplicity; the
 *   product team is aware.
 *
 * Output:
 *   `{ emailsSent, classesProcessed }` — useful for cron logging.
 */

import { Result } from "@/domain/shared/Result";
import type { ILiveClassRepository } from "@/ports/repositories/ILiveClassRepository";
import type { IEnrollmentRepository } from "@/ports/repositories/IEnrollmentRepository";
import type { UserRepository } from "@/ports/repositories/UserRepository";
import type { EmailSender } from "@/ports/email/EmailSender";
import type { LiveClassReminderRenderer } from "@/ports/email/LiveClassReminderRenderer";
import type { Clock } from "@/ports/system/Clock";
import type { Logger } from "@/ports/observability/Logger";

const DEFAULT_WINDOW_MINUTES = 60;

export type SendLiveClassRemindersInput = {
  windowMinutes?: number;
};

export type SendLiveClassRemindersOutput = {
  emailsSent: number;
  classesProcessed: number;
};

export type SendLiveClassRemindersError = {
  kind: "repo_error";
  message: string;
};

export interface SendLiveClassRemindersDeps {
  liveClassRepo: ILiveClassRepository;
  enrollmentRepo: IEnrollmentRepository;
  userRepo: UserRepository;
  email: EmailSender;
  clock: Clock;
  logger: Logger;
  renderer: LiveClassReminderRenderer;
}

export class SendLiveClassReminders {
  constructor(private readonly deps: SendLiveClassRemindersDeps) {}

  async execute(
    input: SendLiveClassRemindersInput = {},
  ): Promise<Result<SendLiveClassRemindersOutput, SendLiveClassRemindersError>> {
    const windowMinutes = input.windowMinutes ?? DEFAULT_WINDOW_MINUTES;
    const now = this.deps.clock.now();
    const windowEnd = new Date(now.getTime() + windowMinutes * 60_000);

    // 1. List all live classes (the repo already excludes cancelled)
    const classesResult = await this.deps.liveClassRepo.listAll();
    if (!classesResult.ok) {
      return Result.err({
        kind: "repo_error",
        message: `liveClassRepo.listAll failed: ${classesResult.error.kind}`,
      });
    }

    // 2. Filter to the in-window scheduled classes
    const upcoming = classesResult.value.filter(
      (c) =>
        c.status === "scheduled" &&
        c.scheduledAt.getTime() >= now.getTime() &&
        c.scheduledAt.getTime() <= windowEnd.getTime(),
    );

    let emailsSent = 0;
    let classesProcessed = 0;

    for (const cls of upcoming) {
      // 3. Find the enrolled students for this course
      const enrollmentsResult = await this.deps.enrollmentRepo.findByCourseId(cls.courseId);
      if (!enrollmentsResult.ok) {
        this.deps.logger.error("send_live_class_reminders.enrollments_failed", {
          liveClassId: cls.id,
          courseId: cls.courseId,
          error: enrollmentsResult.error,
        });
        continue;
      }

      const studentIds = enrollmentsResult.value.map((e) => e.userId);
      if (studentIds.length === 0) {
        // No students enrolled in this course — skip silently
        continue;
      }

      classesProcessed += 1;
      const minutesUntilStart = Math.round(
        (cls.scheduledAt.getTime() - now.getTime()) / 60_000,
      );

      for (const studentId of studentIds) {
        const userResult = await this.deps.userRepo.findById(studentId);
        if (!userResult.ok) {
          this.deps.logger.error("send_live_class_reminders.user_not_found", {
            liveClassId: cls.id,
            userId: studentId,
          });
          continue;
        }
        const user = userResult.value;

        const react = this.deps.renderer.render({
          firstName: user.firstName,
          classTitle: cls.title,
          startsAt: cls.scheduledAt,
          joinUrl: cls.meetingUrl,
          minutesUntilStart,
        });

        const sendResult = await this.deps.email.send({
          to: user.email,
          subject: `Reminder: ${cls.title} starts in ${minutesUntilStart} minutes`,
          react,
        });
        if (sendResult.ok) {
          emailsSent += 1;
        } else {
          this.deps.logger.error("send_live_class_reminders.email_send_failed", {
            liveClassId: cls.id,
            userId: user.id,
            error: sendResult.error,
          });
        }
      }
    }

    this.deps.logger.info("send_live_class_reminders.done", {
      classesProcessed,
      emailsSent,
      windowMinutes,
    });

    return Result.ok({ emailsSent, classesProcessed });
  }
}
