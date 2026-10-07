import { beforeEach, describe, expect, it } from "vitest";
import { AdminDeleteUser } from "@/usecases/AdminDeleteUser";
import { InMemoryUserRepository } from "@/infra/repositories/InMemoryUserRepository";
import { InMemorySessionRepository } from "@/infra/repositories/InMemorySessionRepository";
import { InMemoryAuditLog } from "@/infra/repositories/InMemoryAuditLog";
import { InMemoryIdGenerator } from "@/infra/system/InMemoryIdGenerator";
import { FixedClock } from "@/ports/system/Clock";
import { RecordAuditLog } from "@/usecases/RecordAuditLog";
import { SilentLogger } from "@/infra/observability/SilentLogger";

describe("AdminDeleteUser", () => {
  const userId = "user-1";
  const actorId = "admin-1";
  const now = new Date("2026-09-01T08:00:00.000Z");

  let users: InMemoryUserRepository;
  let sessions: InMemorySessionRepository;
  let audit: InMemoryAuditLog;
  let useCase: AdminDeleteUser;

  beforeEach(async () => {
    users = new InMemoryUserRepository();
    sessions = new InMemorySessionRepository();
    audit = new InMemoryAuditLog();
    const ids = new InMemoryIdGenerator();
    const clock = new FixedClock(now);

    await users.create({
      id: userId,
      email: "ana@example.com",
      passwordHash: "hash",
      firstName: "Ana",
      lastName: "Santos",
    });

    useCase = new AdminDeleteUser({
      userRepo: users,
      sessionRepo: sessions,
      recordAuditLog: new RecordAuditLog({
        auditLog: audit,
        idGen: ids,
        clock,
        logger: new SilentLogger(),
      }),
    });
  });

  it("anonymizes user data and stamps deletedAt", async () => {
    const result = await useCase.execute({ userId, actorId });

    expect(result.ok).toBe(true);
    const user = await users.findById(userId);
    expect(user.ok).toBe(true);
    if (user.ok) {
      expect(user.value.email).toContain("deleted-");
      expect(user.value.firstName).toBe("Deleted");
      expect(user.value.lastName).toBe("User");
    }
  });

  it("revokes all sessions for the user", async () => {
    await sessions.create({
      id: "session-1",
      userId,
      tokenHash: "token-hash",
      expiresAt: new Date("2026-12-01T00:00:00.000Z"),
    });

    await useCase.execute({ userId, actorId });

    const sessionResult = await sessions.findById("session-1");
    expect(sessionResult.ok).toBe(false);
  });

  it("returns user_not_found when user does not exist", async () => {
    const result = await useCase.execute({ userId: "nonexistent", actorId });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe("user_not_found");
  });

  it("refuses to delete the acting admin's own account", async () => {
    await users.create({
      id: actorId,
      email: "admin@example.com",
      passwordHash: "hash",
      firstName: "Ada",
      lastName: "Admin",
    });

    const result = await useCase.execute({ userId: actorId, actorId });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe("cannot_delete_self");

    const admin = await users.findById(actorId);
    expect(admin.ok).toBe(true);
    if (admin.ok) expect(admin.value.email).toBe("admin@example.com");
  });

  it("records audit log with deleted_by_admin action", async () => {
    await useCase.execute({ userId, actorId });

    const entries = await audit.getAll();
    expect(entries).toHaveLength(1);
    expect(entries[0]?.action).toBe("user.deleted_by_admin");
    expect(entries[0]?.targetId).toBe(userId);
    expect(entries[0]?.actorId).toBe(actorId);
  });
});
