import { describe, it, expect, beforeEach } from "vitest";
import { DeleteUserAccount } from "../DeleteUserAccount";
import { InMemoryUserRepository } from "@/infra/repositories/InMemoryUserRepository";
import { InMemorySessionRepository } from "@/infra/repositories/InMemorySessionRepository";
import { InMemoryAuditLog } from "@/infra/repositories/InMemoryAuditLog";
import { RecordAuditLog } from "@/usecases/RecordAuditLog";
import { FixedClock } from "@/ports/system/Clock";
import { Argon2PasswordHasher } from "@/infra/security/Argon2PasswordHasher";
import { SilentLogger } from "@/infra/observability/SilentLogger";

function makeRecordAuditLog(audit: InMemoryAuditLog) {
  return new RecordAuditLog({
    auditLog: audit,
    idGen: { newId: () => "audit_1", paymentRef: () => "x", receiptNumber: () => "x" },
    clock: new FixedClock(new Date("2026-01-01T00:00:00Z")),
    logger: new SilentLogger(),
  });
}

async function seedStudent(userRepo: InMemoryUserRepository, hasher: Argon2PasswordHasher) {
  await userRepo.create({
    id: "student_1",
    email: "student@example.com",
    passwordHash: "",
    firstName: "Jane",
    lastName: "Doe",
  });
  const hashResult = await hasher.hash("CorrectP@ssw0rd");
  if (!hashResult.ok) throw new Error("hash failed");
  await userRepo.update("student_1", { passwordHash: hashResult.value });
}

describe("DeleteUserAccount", () => {
  let userRepo: InMemoryUserRepository;
  let sessionRepo: InMemorySessionRepository;
  let audit: InMemoryAuditLog;
  let hasher: Argon2PasswordHasher;
  let useCase: DeleteUserAccount;

  beforeEach(() => {
    userRepo = new InMemoryUserRepository();
    sessionRepo = new InMemorySessionRepository();
    audit = new InMemoryAuditLog();
    hasher = new Argon2PasswordHasher();
    useCase = new DeleteUserAccount({
      userRepo,
      hasher,
      sessionRepo,
      recordAuditLog: makeRecordAuditLog(audit),
    });
  });

  it("anonymizes the account when the password is correct", async () => {
    await seedStudent(userRepo, hasher);

    const r = await useCase.execute({ userId: "student_1", password: "CorrectP@ssw0rd" });
    expect(r.ok).toBe(true);

    const found = await userRepo.findById("student_1");
    expect(found.ok).toBe(true);
    if (!found.ok) return;
    expect(found.value.email).toBe("deleted-student_1@deleted.projectamazonph.invalid");
    expect(found.value.firstName).toBe("Deleted");
    expect(found.value.lastName).toBe("User");
  });

  it("returns wrong_password and leaves the account untouched for an incorrect password", async () => {
    await seedStudent(userRepo, hasher);

    const r = await useCase.execute({ userId: "student_1", password: "WrongPassword" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("wrong_password");

    const found = await userRepo.findById("student_1");
    expect(found.ok && found.value.email).toBe("student@example.com");
  });

  it("returns user_not_found for a nonexistent user", async () => {
    const r = await useCase.execute({ userId: "ghost", password: "x" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("user_not_found");
  });

  it("revokes every session for the user on success", async () => {
    await seedStudent(userRepo, hasher);
    await sessionRepo.create({
      id: "sess_1",
      userId: "student_1",
      tokenHash: "hash",
      expiresAt: new Date("2030-01-01T00:00:00Z"),
    });

    await useCase.execute({ userId: "student_1", password: "CorrectP@ssw0rd" });

    const found = await sessionRepo.findById("sess_1");
    expect(found.ok).toBe(false);
  });

  it("writes an audit log entry on success", async () => {
    await seedStudent(userRepo, hasher);
    await useCase.execute({ userId: "student_1", password: "CorrectP@ssw0rd" });

    const logs = await audit.getAll();
    expect(
      logs.some((l) => l.action === "user.account_deleted" && l.targetId === "student_1"),
    ).toBe(true);
  });

  it("does not write an audit log entry when the password is wrong", async () => {
    await seedStudent(userRepo, hasher);
    await useCase.execute({ userId: "student_1", password: "WrongPassword" });

    const logs = await audit.getAll();
    expect(logs.some((l) => l.action === "user.account_deleted")).toBe(false);
  });
});
