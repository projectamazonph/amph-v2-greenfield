import { beforeEach, describe, expect, it } from "vitest";
import { AdminUpdateUser } from "@/usecases/AdminUpdateUser";
import type { Role } from "@/domain/entities/User";
import { InMemoryUserRepository } from "@/infra/repositories/InMemoryUserRepository";
import { InMemoryAuditLog } from "@/infra/repositories/InMemoryAuditLog";
import { InMemoryIdGenerator } from "@/infra/system/InMemoryIdGenerator";
import { FixedClock } from "@/ports/system/Clock";
import { RecordAuditLog } from "@/usecases/RecordAuditLog";
import { SilentLogger } from "@/infra/observability/SilentLogger";

describe("AdminUpdateUser", () => {
  const userId = "user-1";
  const actorId = "admin-1";
  const now = new Date("2026-09-01T08:00:00.000Z");

  let users: InMemoryUserRepository;
  let audit: InMemoryAuditLog;
  let useCase: AdminUpdateUser;

  beforeEach(async () => {
    users = new InMemoryUserRepository();
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

    useCase = new AdminUpdateUser({
      userRepo: users,
      recordAuditLog: new RecordAuditLog({
        auditLog: audit,
        idGen: ids,
        clock,
        logger: new SilentLogger(),
      }),
    });
  });

  it("updates firstName and lastName", async () => {
    const result = await useCase.execute({
      userId,
      actorId,
      firstName: "Maria",
      lastName: "Cruz",
    });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.userId).toBe(userId);
    const user = await users.findById(userId);
    expect(user.ok).toBe(true);
    if (user.ok) {
      expect(user.value.firstName).toBe("Maria");
      expect(user.value.lastName).toBe("Cruz");
    }
  });

  it("updates role to INSTRUCTOR", async () => {
    const result = await useCase.execute({
      userId,
      actorId,
      role: "INSTRUCTOR",
    });

    expect(result.ok).toBe(true);
    const user = await users.findById(userId);
    expect(user.ok).toBe(true);
    if (user.ok) expect(user.value.role).toBe("INSTRUCTOR");
  });

  it("updates role to ADMIN", async () => {
    const result = await useCase.execute({
      userId,
      actorId,
      role: "ADMIN",
    });

    expect(result.ok).toBe(true);
    const user = await users.findById(userId);
    expect(user.ok).toBe(true);
    if (user.ok) expect(user.value.role).toBe("ADMIN");
  });

  it("returns user_not_found when user does not exist", async () => {
    const result = await useCase.execute({
      userId: "nonexistent",
      actorId,
      firstName: "Test",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe("user_not_found");
  });

  it("rejects empty firstName", async () => {
    const result = await useCase.execute({
      userId,
      actorId,
      firstName: "   ",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe("invalid_name");
  });

  it("rejects empty lastName", async () => {
    const result = await useCase.execute({
      userId,
      actorId,
      lastName: "   ",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe("invalid_name");
  });

  it("rejects invalid role", async () => {
    const result = await useCase.execute({
      userId,
      actorId,
      role: "SUPERADMIN" as unknown as Role,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe("invalid_role");
  });

  it("rejects a role change on the admin's own account", async () => {
    const result = await useCase.execute({
      userId: actorId,
      actorId,
      role: "STUDENT",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe("cannot_change_own_role");
  });

  it("allows renaming the admin's own account", async () => {
    await users.create({
      id: actorId,
      email: "admin@example.com",
      passwordHash: "hash",
      firstName: "Ada",
      lastName: "Admin",
    });

    const result = await useCase.execute({
      userId: actorId,
      actorId,
      firstName: "Adriana",
      lastName: "Admin",
    });

    expect(result.ok).toBe(true);
    const admin = await users.findById(actorId);
    expect(admin.ok).toBe(true);
    if (admin.ok) expect(admin.value.firstName).toBe("Adriana");
  });

  it("records audit log on successful update", async () => {
    await useCase.execute({ userId, actorId, firstName: "Ana", role: "INSTRUCTOR" });

    const entries = await audit.getAll();
    expect(entries).toHaveLength(1);
    expect(entries[0]?.action).toBe("user.profile_updated");
    expect(entries[0]?.targetId).toBe(userId);
    expect(entries[0]?.actorId).toBe(actorId);
  });

  it("returns ok with no-op when no fields provided", async () => {
    const result = await useCase.execute({ userId, actorId });

    expect(result.ok).toBe(true);
  });
});
