/**
 * SendLiveClassReminders use case — P0-7.
 *
 * RED phase: pin the contract before implementation.
 *
 * The use case:
 * 1. Find all scheduled live classes whose scheduledAt falls in the
 *    next `windowMinutes` (default 60) from `now`.
 * 2. For each such class, find all enrolled students.
 * 3. For each (class, student) pair, render the LiveClassReminderEmail
 *    and call emailSender.send().
 * 4. Return the count of emails sent and the classes processed.
 *
 * Errors:
 *   - repo_error: a downstream repo call failed
 *
 * Idempotency:
 *   The use case is safe to call from a cron every 5 minutes. It does
 *   NOT de-duplicate; the upstream scheduler (cron + a sent-reminders
 *   log) is responsible for that. For P0-7 we accept the simplicity
 *   and add de-duplication as a follow-up if it becomes a problem.
 *
 * Tests:
 *   1. happy: 1 class with 2 students in 30 min → 2 emails
 *   2. skips-classes-too-far-out: class in 2 hours → 0 emails
 *   3. skips-classes-already-started: class 5 min ago → 0 emails
 *   4. skips-cancelled-classes: class in 30 min but cancelled → 0
 *   5. skips-classes-with-no-enrollments: 0 students → 0 emails
 *   6. multiple-classes: 3 classes (in window, out, cancelled) → only
 *      the in-window one's enrolled students get emails
 *   7. email-content: verify the recipient, subject, and a body field
 */

import { describe, it, expect, beforeEach } from "vitest";
import { Result } from "@/domain/shared/Result";
import { SendLiveClassReminders } from "@/usecases/SendLiveClassReminders";
import { InMemoryLiveClassRepository } from "@/infra/live-class/InMemoryLiveClassRepository";
import { InMemoryEnrollmentRepository } from "@/infra/repositories/InMemoryEnrollmentRepository";
import { InMemoryUserRepository } from "@/infra/repositories/InMemoryUserRepository";
import { FixedClock } from "@/ports/system/Clock";
import { createLiveClass } from "@/domain/entities/LiveClass";
import { createEnrollment } from "@/domain/entities/Enrollment";
import { createUser } from "@/domain/entities/User";
import type { EmailSender } from "@/ports/email/EmailSender";
import { LiveClassReminderTemplateRenderer } from "@/infra/email/templates/LiveClassReminderRenderer";
import { InMemorySentReminderRepository } from "@/infra/db/inmemory/InMemorySentReminderRepository";
import type { Logger } from "@/ports/observability/Logger";

class SilentLogger implements Logger {
  debug() {}
  info() {}
  warn() {}
  error() {}
  child() {
    return this;
  }
}

class StubEmailSender implements EmailSender {
  public sent: Array<{ to: string; subject: string; react: unknown }> = [];
  async send(args: Parameters<EmailSender["send"]>[0]) {
    this.sent.push({ to: args.to, subject: args.subject, react: args.react });
    return Result.ok({ messageId: "msg-1" } as never);
  }
}

describe("SendLiveClassReminders", () => {
  let liveClassRepo: InMemoryLiveClassRepository;
  let enrollmentRepo: InMemoryEnrollmentRepository;
  let userRepo: InMemoryUserRepository;
  let emailSender: StubEmailSender;
  let sentReminderRepo: InMemorySentReminderRepository;
  let useCase: SendLiveClassReminders;
  const renderer = new LiveClassReminderTemplateRenderer();

  const NOW = new Date("2026-07-20T10:00:00Z");

  beforeEach(() => {
    liveClassRepo = new InMemoryLiveClassRepository();
    enrollmentRepo = new InMemoryEnrollmentRepository();
    userRepo = new InMemoryUserRepository();
    emailSender = new StubEmailSender();
    sentReminderRepo = new InMemorySentReminderRepository();
    useCase = new SendLiveClassReminders({
      liveClassRepo,
      enrollmentRepo,
      userRepo,
      email: emailSender,
      sentReminders: sentReminderRepo,
      clock: new FixedClock(NOW),
      logger: new SilentLogger(),
      renderer,
    });
  });

  async function seedUser(opts: { id: string; firstName: string; email: string }) {
    const r = await userRepo.create({
      id: opts.id,
      email: opts.email,
      passwordHash: "stub",
      firstName: opts.firstName,
      lastName: "R",
    });
    if (!r.ok) throw new Error("seed user failed");
    return r.value;
  }

  async function seedClass(opts: {
    id: string;
    courseId: string;
    title: string;
    minutesFromNow: number;
    status?: "scheduled" | "cancelled" | "completed";
  }) {
    const scheduledAt = new Date(NOW.getTime() + opts.minutesFromNow * 60_000);

    // The createLiveClass factory refuses past dates by design. For
    // the "skips classes that have already started" tests, we need
    // to seed a class with a past scheduledAt. Build the LiveClass
    // object directly and inject it via the repo's create() (which
    // doesn't enforce factory-level rules).
    const status = opts.status ?? "scheduled";
    if (scheduledAt <= new Date()) {
      const lc = {
        id: opts.id,
        courseId: opts.courseId,
        title: opts.title,
        scheduledAt,
        durationMinutes: 60,
        instructorId: "instr-1",
        meetingUrl: "https://zoom.us/j/1234567890",
        status,
        createdAt: NOW,
        updatedAt: NOW,
      } as const;
      const r = await liveClassRepo.create(lc as never);
      if (!r.ok) throw new Error("seed class failed");
      return lc as never;
    }

    const created = createLiveClass({
      id: opts.id,
      courseId: opts.courseId,
      title: opts.title,
      scheduledAt,
      durationMinutes: 60,
      instructorId: "instr-1",
      meetingUrl: "https://zoom.us/j/1234567890",
      status,
    });
    if (!created.ok) throw new Error("createLiveClass failed");
    const r = await liveClassRepo.create(created.value);
    if (!r.ok) throw new Error("seed class failed");
    return created.value;
  }

  async function seedEnrollment(opts: { userId: string; courseId: string }) {
    const c = createEnrollment({
      id: `enr-${opts.userId}-${opts.courseId}`,
      userId: opts.userId,
      courseId: opts.courseId,
    });
    if (!c.ok) throw new Error("createEnrollment factory failed");
    const r = await enrollmentRepo.create(c.value);
    if (!r.ok) throw new Error("seed enrollment failed: " + JSON.stringify(r.error));
    return r.value;
  }

  it("sends one email per enrolled student for an upcoming class", async () => {
    const cls = await seedClass({
      id: "class-1",
      courseId: "course-1",
      title: "PPC 101",
      minutesFromNow: 30,
    });
    const u1 = await seedUser({ id: "u-1", firstName: "Alice", email: "a@e.com" });
    const u2 = await seedUser({ id: "u-2", firstName: "Bob", email: "b@e.com" });
    await seedEnrollment({ userId: u1.id, courseId: cls.courseId });
    await seedEnrollment({ userId: u2.id, courseId: cls.courseId });

    const result = await useCase.execute();

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.emailsSent).toBe(2);
    expect(result.value.classesProcessed).toBe(1);
    expect(emailSender.sent).toHaveLength(2);
    expect(emailSender.sent.map((s) => s.to).sort()).toEqual(["a@e.com", "b@e.com"]);
  });

  it("skips classes scheduled too far in the future", async () => {
    const cls = await seedClass({
      id: "class-1",
      courseId: "course-1",
      title: "Future",
      minutesFromNow: 120, // 2 hours
    });
    await seedUser({ id: "u-1", firstName: "Alice", email: "a@e.com" });
    await seedEnrollment({ userId: "u-1", courseId: cls.courseId });

    const result = await useCase.execute();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.emailsSent).toBe(0);
    expect(result.value.classesProcessed).toBe(0);
  });

  it("skips classes that have already started", async () => {
    const cls = await seedClass({
      id: "class-1",
      courseId: "course-1",
      title: "Past",
      minutesFromNow: -5,
    });
    await seedUser({ id: "u-1", firstName: "Alice", email: "a@e.com" });
    await seedEnrollment({ userId: "u-1", courseId: cls.courseId });

    const result = await useCase.execute();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.emailsSent).toBe(0);
  });

  it("skips cancelled classes", async () => {
    const cls = await seedClass({
      id: "class-1",
      courseId: "course-1",
      title: "Cancelled",
      minutesFromNow: 30,
      status: "cancelled",
    });
    await seedUser({ id: "u-1", firstName: "Alice", email: "a@e.com" });
    await seedEnrollment({ userId: "u-1", courseId: cls.courseId });

    const result = await useCase.execute();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.emailsSent).toBe(0);
  });

  it("skips classes with no enrollments", async () => {
    await seedClass({
      id: "class-1",
      courseId: "course-1",
      title: "Empty",
      minutesFromNow: 30,
    });

    const result = await useCase.execute();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.emailsSent).toBe(0);
  });

  it("processes only in-window scheduled classes among many", async () => {
    const inWindow = await seedClass({
      id: "in-window",
      courseId: "course-1",
      title: "Soon",
      minutesFromNow: 15,
    });
    await seedClass({
      id: "far",
      courseId: "course-1",
      title: "Later",
      minutesFromNow: 200,
    });
    await seedClass({
      id: "cancelled",
      courseId: "course-1",
      title: "Cancelled",
      minutesFromNow: 30,
      status: "cancelled",
    });
    await seedClass({
      id: "past",
      courseId: "course-1",
      title: "Past",
      minutesFromNow: -10,
    });

    await seedUser({ id: "u-1", firstName: "Alice", email: "a@e.com" });
    await seedEnrollment({ userId: "u-1", courseId: inWindow.courseId });

    const result = await useCase.execute();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.classesProcessed).toBe(1);
    expect(result.value.emailsSent).toBe(1);
    expect(emailSender.sent[0]!.to).toBe("a@e.com");
  });

  it("sends an email with the correct recipient, subject, and content", async () => {
    const cls = await seedClass({
      id: "class-1",
      courseId: "course-1",
      title: "PPC Mastery",
      minutesFromNow: 30,
    });
    const u = await seedUser({ id: "u-1", firstName: "Alice", email: "a@e.com" });
    await seedEnrollment({ userId: u.id, courseId: cls.courseId });

    await useCase.execute();

    expect(emailSender.sent).toHaveLength(1);
    const sent = emailSender.sent[0]!;
    expect(sent.to).toBe("a@e.com");
    expect(sent.subject).toMatch(/PPC Mastery/);

    // Render the React element to verify the body
    const { renderToStaticMarkup } = await import("react-dom/server");
    const html = renderToStaticMarkup(sent.react as React.ReactElement);
    expect(html).toContain("Alice");
    expect(html).toContain("PPC Mastery");
    expect(html).toContain("30 minutes");
  });

  // ── idempotency (P0-7 follow-up) ───────────────────────────────────

  it("skips a (class, student) pair that was already reminded", async () => {
    const cls = await seedClass({
      id: "class-1",
      courseId: "course-1",
      title: "PPC 101",
      minutesFromNow: 30,
    });
    const u1 = await seedUser({ id: "u-1", firstName: "Alice", email: "a@e.com" });
    const u2 = await seedUser({ id: "u-2", firstName: "Bob", email: "b@e.com" });
    await seedEnrollment({ userId: u1.id, courseId: cls.courseId });
    await seedEnrollment({ userId: u2.id, courseId: cls.courseId });

    // Mark Alice as already reminded (simulating a prior cron run)
    await sentReminderRepo.markSent({ liveClassId: cls.id, userId: u1.id });

    const result = await useCase.execute();

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // Only Bob gets the email; Alice was already reminded
    expect(result.value.emailsSent).toBe(1);
    expect(emailSender.sent).toHaveLength(1);
    expect(emailSender.sent[0]!.to).toBe("b@e.com");
  });

  it("marks each sent (class, student) pair after a successful send", async () => {
    const cls = await seedClass({
      id: "class-1",
      courseId: "course-1",
      title: "PPC 101",
      minutesFromNow: 30,
    });
    const u1 = await seedUser({ id: "u-1", firstName: "Alice", email: "a@e.com" });
    const u2 = await seedUser({ id: "u-2", firstName: "Bob", email: "b@e.com" });
    await seedEnrollment({ userId: u1.id, courseId: cls.courseId });
    await seedEnrollment({ userId: u2.id, courseId: cls.courseId });

    await useCase.execute();

    expect(await sentReminderRepo.wasSent({ liveClassId: cls.id, userId: u1.id })).toBe(true);
    expect(await sentReminderRepo.wasSent({ liveClassId: cls.id, userId: u2.id })).toBe(true);
  });

  it("does NOT mark a (class, student) pair if the email send fails", async () => {
    const cls = await seedClass({
      id: "class-1",
      courseId: "course-1",
      title: "PPC 101",
      minutesFromNow: 30,
    });
    const u = await seedUser({ id: "u-1", firstName: "Alice", email: "a@e.com" });
    await seedEnrollment({ userId: u.id, courseId: cls.courseId });

    // Make the email sender fail
    emailSender = new (class extends StubEmailSender {
      override async send() {
        return Result.err({ kind: "send_failed", message: "smtp down" } as never);
      }
    })();

    useCase = new SendLiveClassReminders({
      liveClassRepo,
      enrollmentRepo,
      userRepo,
      email: emailSender,
      sentReminders: sentReminderRepo,
      clock: new FixedClock(NOW),
      logger: new SilentLogger(),
      renderer,
    });

    const result = await useCase.execute();

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.emailsSent).toBe(0);
    // No markSent call — the next cron run will retry
    expect(await sentReminderRepo.wasSent({ liveClassId: cls.id, userId: u.id })).toBe(false);
  });

  it("is idempotent: running the cron twice sends zero duplicate emails", async () => {
    const cls = await seedClass({
      id: "class-1",
      courseId: "course-1",
      title: "PPC 101",
      minutesFromNow: 30,
    });
    const u = await seedUser({ id: "u-1", firstName: "Alice", email: "a@e.com" });
    await seedEnrollment({ userId: u.id, courseId: cls.courseId });

    // First run
    const r1 = await useCase.execute();
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;
    expect(r1.value.emailsSent).toBe(1);

    // Second run (e.g. cron fires again 5 minutes later)
    const r2 = await useCase.execute();
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;
    expect(r2.value.emailsSent).toBe(0);

    // Total emails sent: exactly 1, not 2
    expect(emailSender.sent).toHaveLength(1);
  });
});
