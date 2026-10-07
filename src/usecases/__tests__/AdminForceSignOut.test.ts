import { beforeEach, describe, expect, it } from "vitest";
import { AdminForceSignOut } from "@/usecases/AdminForceSignOut";
import { InMemorySessionRepository } from "@/infra/repositories/InMemorySessionRepository";
import { InMemoryAuditLog } from "@/infra/repositories/InMemoryAuditLog";
import { InMemoryIdGenerator } from "@/infra/system/InMemoryIdGenerator";
import { FixedClock } from "@/ports/system/Clock";
import { RecordAuditLog } from "@/usecases/RecordAuditLog";
import { SilentLogger } from "@/infra/observability/SilentLogger";

describe("AdminForceSignOut", () => {
  const userId = "user-1";
  const actorId = "admin-1";
  const now = new Date("2026-09-01T08:00:00.000Z");

  let sessions: InMemorySessionRepository;
  let audit: InMemoryAuditLog;
  let useCase: AdminForceSignOut;

  beforeEach(async () => {
    sessions = new InMemorySessionRepository();
    audit = new InMemoryAuditLog();
    const ids = new InMemoryIdGenerator();
    const clock = new FixedClock(now);

    useCase = new AdminForceSignOut({
      sessionRepo: sessions,
      recordAuditLog: new RecordAuditLog({
        auditLog: audit,
        idGen: ids,
        clock,
        logger: new SilentLogger(),
      }),
    });
  });

  it("deletes all sessions for the user", async () => {
    await sessions.create({
      id: "session-1",
      userId,
      tokenHash: "token-1",
      expiresAt: new Date("2026-12-01T00:00:00.000Z"),
    });
    await sessions.create({
      id: "session-2",
      userId,
      tokenHash: "token-2",
      expiresAt: new Date("2026-12-01T00:00:00.000Z"),
    });

    const result = await useCase.execute({ userId, actorId });

    expect(result.ok).toBe(true);
    const s1 = await sessions.findById("session-1");
    const s2 = await sessions.findById("session-2");
    expect(s1.ok).toBe(false);
    expect(s2.ok).toBe(false);
  });

  it("succeeds even when user has no sessions", async () => {
    const result = await useCase.execute({ userId, actorId });

    expect(result.ok).toBe(true);
  });

  it("does not affect sessions of other users", async () => {
    await sessions.create({
      id: "session-other",
      userId: "other-user",
      tokenHash: "token-other",
      expiresAt: new Date("2026-12-01T00:00:00.000Z"),
    });

    await useCase.execute({ userId, actorId });

    const other = await sessions.findById("session-other");
    expect(other.ok).toBe(true);
  });

  it("records audit log with sessions_revoked action", async () => {
    await sessions.create({
      id: "session-1",
      userId,
      tokenHash: "token-1",
      expiresAt: new Date("2026-12-01T00:00:00.000Z"),
    });

    await useCase.execute({ userId, actorId });

    const entries = await audit.getAll();
    expect(entries).toHaveLength(1);
    expect(entries[0]?.action).toBe("user.sessions_revoked");
    expect(entries[0]?.targetId).toBe(userId);
    expect(entries[0]?.actorId).toBe(actorId);
  });
});
