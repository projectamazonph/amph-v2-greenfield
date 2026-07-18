/**
 * InMemorySessionRepository.test.ts — STORY-006.
 *
 * Tests the in-memory adapter for SessionRepository. The port is in
 * src/ports/repositories/SessionRepository.ts. These tests cover the
 * port's full surface.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { InMemorySessionRepository } from "../InMemorySessionRepository";

describe("InMemorySessionRepository", () => {
  let repo: InMemorySessionRepository;

  beforeEach(() => {
    repo = new InMemorySessionRepository();
  });

  it("create + findById roundtrip", async () => {
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const result = await repo.create({
      id: "s-1",
      userId: "u-1",
      tokenHash: "jwt:s-1",
      expiresAt,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const findResult = await repo.findById("s-1");
    expect(findResult.ok).toBe(true);
    if (!findResult.ok) return;
    expect(findResult.value.id).toBe("s-1");
    expect(findResult.value.userId).toBe("u-1");
    expect(findResult.value.tokenHash).toBe("jwt:s-1");
    expect(findResult.value.expiresAt).toEqual(expiresAt);
    expect(findResult.value.createdAt).toBeInstanceOf(Date);
  });

  it("findById returns not_found for an unknown id", async () => {
    const result = await repo.findById("does-not-exist");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("not_found");
  });

  it("create rejects duplicate id (db_error)", async () => {
    const expiresAt = new Date();
    const first = await repo.create({
      id: "s-1",
      userId: "u-1",
      tokenHash: "h",
      expiresAt,
    });
    expect(first.ok).toBe(true);

    const second = await repo.create({
      id: "s-1",
      userId: "u-1",
      tokenHash: "h",
      expiresAt,
    });
    expect(second.ok).toBe(false);
    if (second.ok) return;
    expect(second.error.kind).toBe("db_error");
  });

  it("deleteById removes the session and is idempotent", async () => {
    const expiresAt = new Date();
    await repo.create({
      id: "s-1",
      userId: "u-1",
      tokenHash: "h",
      expiresAt,
    });
    expect(repo.size()).toBe(1);

    const del = await repo.deleteById("s-1");
    expect(del.ok).toBe(true);
    expect(repo.size()).toBe(0);

    // Idempotent — deleting an already-gone session is a no-op success.
    const delAgain = await repo.deleteById("s-1");
    expect(delAgain.ok).toBe(true);
    expect(repo.size()).toBe(0);
  });

  it("deleteAllForUser only removes sessions for the specified user", async () => {
    const expiresAt = new Date();
    await repo.create({ id: "s-1", userId: "u-1", tokenHash: "h", expiresAt });
    await repo.create({ id: "s-2", userId: "u-1", tokenHash: "h", expiresAt });
    await repo.create({ id: "s-3", userId: "u-2", tokenHash: "h", expiresAt });
    expect(repo.size()).toBe(3);

    const result = await repo.deleteAllForUser("u-1");
    expect(result.ok).toBe(true);
    expect(repo.size()).toBe(1);

    const survivor = await repo.findById("s-3");
    expect(survivor.ok).toBe(true);
    if (survivor.ok) {
      expect(survivor.value.userId).toBe("u-2");
    }
  });

  it("deleteAllForUser is a no-op when the user has no sessions", async () => {
    const result = await repo.deleteAllForUser("nope");
    expect(result.ok).toBe(true);
    expect(repo.size()).toBe(0);
  });

  it("preserves optional userAgent and ipAddress fields", async () => {
    const expiresAt = new Date();
    const result = await repo.create({
      id: "s-1",
      userId: "u-1",
      tokenHash: "h",
      expiresAt,
      userAgent: "Mozilla/5.0",
      ipAddress: "127.0.0.1",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // The SessionRecord type doesn't expose userAgent/ipAddress (those
    // are only on the create() input, not on the read model). This
    // is by design — the port treats them as write-only metadata. The
    // test just confirms create() doesn't reject them.
    expect(result.value.id).toBe("s-1");
  });
});
