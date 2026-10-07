import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminSetUserPassword } from "@/usecases/AdminSetUserPassword";
import { InMemoryUserRepository } from "@/infra/repositories/InMemoryUserRepository";
import { InMemorySessionRepository } from "@/infra/repositories/InMemorySessionRepository";
import { InMemoryAuditLog } from "@/infra/repositories/InMemoryAuditLog";
import { InMemoryIdGenerator } from "@/infra/system/InMemoryIdGenerator";
import { FixedClock } from "@/ports/system/Clock";
import { RecordAuditLog } from "@/usecases/RecordAuditLog";
import { SilentLogger } from "@/infra/observability/SilentLogger";
import type { EmailSender } from "@/ports/email/EmailSender";
import type { PasswordChangedRenderer } from "@/ports/email/PasswordChangedRenderer";
import type { PasswordHasher } from "@/ports/security/PasswordHasher";
import type { ReactElement } from "react";

describe("AdminSetUserPassword", () => {
  const userId = "user-1";
  const actorId = "admin-1";
  const now = new Date("2026-09-01T08:00:00.000Z");

  let users: InMemoryUserRepository;
  let sessions: InMemorySessionRepository;
  let audit: InMemoryAuditLog;
  let fakeEmailSender: EmailSender;
  let fakeRenderer: PasswordChangedRenderer;
  let fakeHasher: PasswordHasher;
  let useCase: AdminSetUserPassword;

  beforeEach(async () => {
    users = new InMemoryUserRepository();
    sessions = new InMemorySessionRepository();
    audit = new InMemoryAuditLog();
    const ids = new InMemoryIdGenerator();
    const clock = new FixedClock(now);

    await users.create({
      id: userId,
      email: "ana@example.com",
      passwordHash: "old-hash",
      firstName: "Ana",
      lastName: "Santos",
    });

    fakeEmailSender = {
      send: vi.fn().mockResolvedValue({ ok: true, value: { messageId: "msg-1" } }),
    };

    fakeRenderer = {
      render: vi.fn().mockReturnValue({ type: "div" } as unknown as ReactElement),
    };

    fakeHasher = {
      hash: vi.fn().mockResolvedValue({ ok: true, value: "new-hash-value" }),
      verify: vi.fn(),
    };

    useCase = new AdminSetUserPassword({
      userRepo: users,
      sessionRepo: sessions,
      passwordHasher: fakeHasher,
      recordAuditLog: new RecordAuditLog({
        auditLog: audit,
        idGen: ids,
        clock,
        logger: new SilentLogger(),
      }),
      emailSender: fakeEmailSender,
      passwordChangedEmailRenderer: fakeRenderer,
      logger: new SilentLogger(),
      clock,
    });
  });

  it("hashes password and updates user", async () => {
    const result = await useCase.execute({
      userId,
      actorId,
      newPassword: "Str0ng!Pass",
      sendNotificationEmail: false,
    });

    expect(result.ok).toBe(true);
    expect(fakeHasher.hash).toHaveBeenCalledWith("Str0ng!Pass");
    const user = await users.findById(userId);
    expect(user.ok).toBe(true);
    if (user.ok) expect(user.value.id).toBe(userId);
  });

  it("revokes all sessions after password change", async () => {
    // Create a session for the user
    await sessions.create({
      id: "session-1",
      userId,
      tokenHash: "token-hash",
      expiresAt: new Date("2026-12-01T00:00:00.000Z"),
    });

    const result = await useCase.execute({
      userId,
      actorId,
      newPassword: "Str0ng!Pass",
      sendNotificationEmail: false,
    });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.sessionsRevoked).toBe(true);
  });

  it("sends notification email when sendNotificationEmail is true", async () => {
    await useCase.execute({
      userId,
      actorId,
      newPassword: "Str0ng!Pass",
      sendNotificationEmail: true,
    });

    expect(fakeRenderer.render).toHaveBeenCalledWith({
      firstName: "Ana",
      changedAt: now,
    });
    expect(fakeEmailSender.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "ana@example.com",
        subject: "Your Project Amazon PH Academy password was changed",
      }),
    );
  });

  it("does not send email when sendNotificationEmail is false", async () => {
    await useCase.execute({
      userId,
      actorId,
      newPassword: "Str0ng!Pass",
      sendNotificationEmail: false,
    });

    expect(fakeEmailSender.send).not.toHaveBeenCalled();
  });

  it("rejects passwords shorter than 8 characters", async () => {
    const result = await useCase.execute({
      userId,
      actorId,
      newPassword: "Short1!",
      sendNotificationEmail: false,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe("weak_password");
  });

  it("rejects passwords with score below 3", async () => {
    const result = await useCase.execute({
      userId,
      actorId,
      newPassword: "onlylowercase",
      sendNotificationEmail: false,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe("weak_password");
  });

  it("rejects when user not found", async () => {
    const result = await useCase.execute({
      userId: "nonexistent",
      actorId,
      newPassword: "Str0ng!Pass",
      sendNotificationEmail: false,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe("user_not_found");
  });

  it("records audit log on success", async () => {
    await useCase.execute({
      userId,
      actorId,
      newPassword: "Str0ng!Pass",
      sendNotificationEmail: false,
    });

    const entries = await audit.getAll();
    expect(entries).toHaveLength(1);
    expect(entries[0]?.action).toBe("user.password_changed_by_admin");
    expect(entries[0]?.targetId).toBe(userId);
    expect(entries[0]?.actorId).toBe(actorId);
  });
});
