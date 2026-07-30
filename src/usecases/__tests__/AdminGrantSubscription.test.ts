/**
 * AdminGrantSubscription use case.
 *
 * Admin manually grants a student a subscription tier outside the
 * checkout flow (paid outside the platform). Covers:
 *  - new user: account created, tier set, audit logged, claim email sent
 *  - existing user: tier updated, no account created, no claim email
 *  - payment metadata recorded in the audit log when provided
 *  - validation: invalid email, missing first/last name for new accounts
 *  - db_error propagation from hash / create / update
 *  - the email_taken race between findByEmail and create
 */

import { describe, it, expect, beforeEach } from "vitest";
import { Result } from "@/domain/shared/Result";
import type { User } from "@/domain/entities/User";
import type { UserError } from "@/ports/repositories/UserRepository";
import type { PasswordHasher, HashError } from "@/ports/security/PasswordHasher";
import { AdminGrantSubscription } from "../AdminGrantSubscription";
import { RecordAuditLog } from "@/usecases/RecordAuditLog";
import { RequestPasswordReset } from "@/usecases/auth/RequestPasswordReset";
import { InMemoryUserRepository } from "@/infra/repositories/InMemoryUserRepository";
import { InMemoryAuditLog } from "@/infra/repositories/InMemoryAuditLog";
import { InMemoryPasswordResetRepository } from "@/infra/db/inmemory/InMemoryPasswordResetRepository";
import { InMemoryEmailSender } from "@/infra/email/InMemoryEmailSender";
import { InMemoryRateLimiter } from "@/infra/security/InMemoryRateLimiter";
import { InMemoryIdGenerator } from "@/infra/system/InMemoryIdGenerator";
import { TestLogger } from "@/infra/observability/TestLogger";
import { PasswordResetTemplateRenderer } from "@/infra/email/templates/PasswordResetRenderer";
import { FixedClock } from "@/ports/system/Clock";

class StubHasher implements PasswordHasher {
  fails = false;
  async hash(password: string): Promise<Result<string, HashError>> {
    if (this.fails) return Result.err({ kind: "hash_error" });
    return Result.ok(`hashed:${password}`);
  }
  async verify(): Promise<Result<boolean, never>> {
    return Result.ok(true);
  }
}

class CreateFailsRepo extends InMemoryUserRepository {
  async create(): Promise<Result<User, UserError>> {
    return Result.err({ kind: "db_error", message: "insert failed" });
  }
}

class EmailTakenRaceRepo extends InMemoryUserRepository {
  async create(): Promise<Result<User, UserError>> {
    return Result.err({ kind: "email_taken" });
  }
}

class UpdateFailsRepo extends InMemoryUserRepository {
  async update(): Promise<Result<User, UserError>> {
    return Result.err({ kind: "db_error", message: "update failed" });
  }
}

function buildRequestPasswordReset(deps: {
  users: InMemoryUserRepository;
  passwordResets: InMemoryPasswordResetRepository;
  email: InMemoryEmailSender;
  clock: FixedClock;
  idGen: InMemoryIdGenerator;
}) {
  return new RequestPasswordReset({
    users: deps.users,
    passwordResets: deps.passwordResets,
    email: deps.email,
    passwordResetEmailRenderer: new PasswordResetTemplateRenderer(),
    rateLimiter: new InMemoryRateLimiter(),
    clock: deps.clock,
    ids: deps.idGen,
    logger: new TestLogger(),
  });
}

describe("AdminGrantSubscription", () => {
  let users: InMemoryUserRepository;
  let audit: InMemoryAuditLog;
  let email: InMemoryEmailSender;
  let passwordResets: InMemoryPasswordResetRepository;
  let idGen: InMemoryIdGenerator;
  let clock: FixedClock;
  let hasher: StubHasher;

  beforeEach(() => {
    users = new InMemoryUserRepository();
    audit = new InMemoryAuditLog();
    email = new InMemoryEmailSender();
    passwordResets = new InMemoryPasswordResetRepository();
    idGen = new InMemoryIdGenerator();
    clock = new FixedClock(new Date("2026-01-01T00:00:00Z"));
    hasher = new StubHasher();
  });

  function build(userRepo: InMemoryUserRepository = users) {
    const recordAuditLog = new RecordAuditLog({ auditLog: audit, idGen, clock });
    const requestPasswordReset = buildRequestPasswordReset({
      users: userRepo,
      passwordResets,
      email,
      clock,
      idGen,
    });
    return new AdminGrantSubscription({
      userRepo,
      idGen,
      passwordHasher: hasher,
      recordAuditLog,
      requestPasswordReset,
    });
  }

  it("creates a new account, grants the tier, audits it, and sends a claim email", async () => {
    const useCase = build();
    const r = await useCase.execute({
      email: "New@Student.com",
      firstName: "Maria",
      lastName: "Santos",
      subscriptionTier: "PRO",
      actorId: "admin-1",
    });

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.isNewUser).toBe(true);
    expect(r.value.subscriptionTier).toBe("PRO");

    const stored = await users.findByEmail("new@student.com");
    expect(stored.ok).toBe(true);
    if (stored.ok) expect(stored.value.subscriptionTier).toBe("PRO");

    const entries = audit.getAll();
    expect(entries).toHaveLength(1);
    expect(entries[0]!.action).toBe("user.subscription_granted");
    expect(entries[0]!.targetType).toBe("user");
    expect(entries[0]!.metadata).toMatchObject({ subscriptionTier: "PRO", isNewUser: true });

    expect(email.sent).toHaveLength(1);
    expect(email.sent[0]!.to).toBe("new@student.com");
  });

  it("grants a tier to an existing user without creating an account or sending a claim email", async () => {
    await users.create({
      id: "user-1",
      email: "existing@student.com",
      passwordHash: "real-hash",
      firstName: "Juan",
      lastName: "Cruz",
    });

    const useCase = build();
    const r = await useCase.execute({
      email: "existing@student.com",
      subscriptionTier: "STARTER",
      actorId: "admin-1",
    });

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.isNewUser).toBe(false);
    expect(r.value.userId).toBe("user-1");

    const stored = await users.findByEmail("existing@student.com");
    expect(stored.ok).toBe(true);
    if (stored.ok) expect(stored.value.subscriptionTier).toBe("STARTER");

    expect(email.sent).toHaveLength(0);
    expect(audit.getAll()[0]!.metadata).toMatchObject({ isNewUser: false });
  });

  it("allows correcting a mistaken grant back to FREE", async () => {
    await users.create({
      id: "user-1",
      email: "oops@student.com",
      passwordHash: "real-hash",
      firstName: "Juan",
      lastName: "Cruz",
    });
    const useCase = build();
    const r = await useCase.execute({
      email: "oops@student.com",
      subscriptionTier: "FREE",
      actorId: "admin-1",
    });
    expect(r.ok).toBe(true);
    const stored = await users.findByEmail("oops@student.com");
    if (stored.ok) expect(stored.value.subscriptionTier).toBe("FREE");
  });

  it("records payment method, amount, and reference in the audit metadata", async () => {
    const useCase = build();
    const r = await useCase.execute({
      email: "paid@student.com",
      firstName: "Ana",
      lastName: "Reyes",
      subscriptionTier: "STARTER",
      actorId: "admin-1",
      payment: { method: "GCash", amountMinor: 299900, reference: "ref-123" },
    });

    expect(r.ok).toBe(true);
    expect(audit.getAll()[0]!.metadata).toMatchObject({
      paymentMethod: "GCash",
      paymentAmountMinor: 299900,
      paymentReference: "ref-123",
    });
  });

  it("does not record payment metadata when no payment is given", async () => {
    const useCase = build();
    await useCase.execute({
      email: "free-grant@student.com",
      firstName: "Ana",
      lastName: "Reyes",
      subscriptionTier: "STARTER",
      actorId: "admin-1",
    });
    expect(audit.getAll()[0]!.metadata.paymentMethod).toBeUndefined();
  });

  it("rejects an invalid email", async () => {
    const useCase = build();
    const r = await useCase.execute({
      email: "not-an-email",
      firstName: "A",
      lastName: "B",
      subscriptionTier: "PRO",
      actorId: "admin-1",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.kind).toBe("invalid_email");
  });

  it("requires a first name for a brand-new account", async () => {
    const useCase = build();
    const r = await useCase.execute({
      email: "noname@student.com",
      lastName: "B",
      subscriptionTier: "PRO",
      actorId: "admin-1",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toEqual({ kind: "invalid_name", field: "firstName" });
  });

  it("requires a last name for a brand-new account", async () => {
    const useCase = build();
    const r = await useCase.execute({
      email: "noname2@student.com",
      firstName: "A",
      subscriptionTier: "PRO",
      actorId: "admin-1",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toEqual({ kind: "invalid_name", field: "lastName" });
  });

  it("propagates a db_error when password hashing fails", async () => {
    hasher.fails = true;
    const useCase = build();
    const r = await useCase.execute({
      email: "hashfail@student.com",
      firstName: "A",
      lastName: "B",
      subscriptionTier: "PRO",
      actorId: "admin-1",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.kind).toBe("db_error");
  });

  it("propagates a db_error when user creation fails", async () => {
    const repo = new CreateFailsRepo();
    const useCase = build(repo);
    const r = await useCase.execute({
      email: "createfail@student.com",
      firstName: "A",
      lastName: "B",
      subscriptionTier: "PRO",
      actorId: "admin-1",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toEqual({ kind: "db_error", message: "insert failed" });
  });

  it("propagates a db_error when the tier update fails", async () => {
    const repo = new UpdateFailsRepo();
    await repo.create({
      id: "user-1",
      email: "updatefail@student.com",
      passwordHash: "real-hash",
      firstName: "Juan",
      lastName: "Cruz",
    });
    const useCase = build(repo);
    const r = await useCase.execute({
      email: "updatefail@student.com",
      subscriptionTier: "PRO",
      actorId: "admin-1",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toEqual({ kind: "db_error", message: "update failed" });
  });

  it("falls back to db_error when create races on email_taken and the re-lookup also fails", async () => {
    const repo = new EmailTakenRaceRepo();
    const useCase = build(repo);
    const r = await useCase.execute({
      email: "race@student.com",
      firstName: "A",
      lastName: "B",
      subscriptionTier: "PRO",
      actorId: "admin-1",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.kind).toBe("db_error");
      expect(r.error).toMatchObject({ message: "email_taken but lookup failed" });
    }
  });
});
