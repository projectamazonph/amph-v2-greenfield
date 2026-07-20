/**
 * Logout.test.ts — TDD for the Logout use case.
 *
 * The use case:
 * 1. Verifies the JWT (the cookie's value)
 * 2. Extracts the `sessionId` claim from the JWT
 * 3. Deletes the session record from the SessionRepository
 * 4. Returns ok (or not_found if the session is already gone —
 *    which is fine for logout, the user wanted to log out, they're
 *    logged out)
 *
 * What we test:
 * - empty token → invalid_token
 * - malformed token → invalid_token
 * - JWT with bad signature → invalid_token
 * - JWT for a non-existent session → not_found
 * - JWT for a real session → ok, session is deleted
 * - Deleting twice is idempotent (second call returns not_found)
 *
 * TDD: this test file is written FIRST, then we implement Logout.
 */

import { describe, it, expect, beforeEach } from "vitest";

import { Logout } from "@/usecases/Logout";
import { buildTestContainer } from "@/composition/container.test";

describe("Logout use case", () => {
  let container: ReturnType<typeof buildTestContainer>;

  beforeEach(() => {
    container = buildTestContainer();
  });

  // ── Input validation ─────────────────────────────────────

  it("returns invalid_token when the token is empty", async () => {
    const useCase = new Logout(container.sessionRepo, container.jwt);
    const result = await useCase.execute({ token: "" });
    expect(result).toEqual({ ok: false, error: { kind: "invalid_token" } });
  });

  it("returns invalid_token when the token is malformed (not a JWT)", async () => {
    const useCase = new Logout(container.sessionRepo, container.jwt);
    const result = await useCase.execute({ token: "not-a-jwt" });
    expect(result).toEqual({ ok: false, error: { kind: "invalid_token" } });
  });

  it("returns invalid_token when the JWT signature is wrong", async () => {
    const useCase = new Logout(container.sessionRepo, container.jwt);
    // A JWT with three parts but invalid signature
    const result = await useCase.execute({
      token: "eyJhbGciOiJIUzI1NiJ9.eyJqdGkiOiJ4In0.invalidsig",
    });
    expect(result).toEqual({ ok: false, error: { kind: "invalid_token" } });
  });

  // ── Session deletion ─────────────────────────────────────

  it("returns ok when the session does not exist in the DB (idempotent logout)", async () => {
    // The Logout use case is idempotent: if the session record is
    // already gone (e.g., expired and cleaned up), the user is
    // already logged out and we treat the logout as success.
    // The repository's deleteById is itself idempotent; the use case
    // propagates that.
    const useCase = new Logout(container.sessionRepo, container.jwt);
    // Mint a valid JWT whose sessionId refers to a non-existent session
    const sign = await container.jwt.sign(
      { sub: "u-test", sessionId: "ghost-session-id", role: "student" },
      "1h",
    );
    expect(sign.ok).toBe(true);
    if (!sign.ok) return;
    const result = await useCase.execute({ token: sign.value });
    expect(result.ok).toBe(true);
  });

  it("deletes the session record and returns ok on success", async () => {
    const useCase = new Logout(container.sessionRepo, container.jwt);
    // Create a real session in the repo
    const sessionId = "sess-to-delete";
    await container.sessionRepo.create({
      id: sessionId,
      userId: "u-test",
      tokenHash: "placeholder-hash",
      expiresAt: new Date(Date.now() + 3600 * 1000),
    });
    // Mint a JWT whose sessionId is that record's id
    const sign = await container.jwt.sign(
      { sub: "u-test", sessionId, role: "student" },
      "1h",
    );
    expect(sign.ok).toBe(true);
    if (!sign.ok) return;
    const result = await useCase.execute({ token: sign.value });
    expect(result.ok).toBe(true);
    // The session is gone
    const found = await container.sessionRepo.findById(sessionId);
    expect(found.ok).toBe(false);
  });

  it("is idempotent: deleting twice with the same token returns ok both times", async () => {
    const useCase = new Logout(container.sessionRepo, container.jwt);
    const sessionId = "sess-already-gone";
    await container.sessionRepo.create({
      id: sessionId,
      userId: "u-test",
      tokenHash: "placeholder-hash",
      expiresAt: new Date(Date.now() + 3600 * 1000),
    });
    const sign = await container.jwt.sign(
      { sub: "u-test", sessionId, role: "student" },
      "1h",
    );
    expect(sign.ok).toBe(true);
    if (!sign.ok) return;
    // First delete: ok
    const r1 = await useCase.execute({ token: sign.value });
    expect(r1.ok).toBe(true);
    // Second delete with same token: ok (idempotent — session already gone)
    const r2 = await useCase.execute({ token: sign.value });
    expect(r2.ok).toBe(true);
  });

  // ── additional edge cases ─────────────────────────────

  it("returns invalid_token when the JWT is valid but carries no sessionId claim", async () => {
    // The Logout use case requires sessionId in the JWT payload —
    // otherwise it's not our session. We mint a JWT via the same
    // secret but with no sessionId in the payload.
    const useCase = new Logout(container.sessionRepo, container.jwt);
    const sign = await container.jwt.sign(
      { sub: "u-test", role: "student" }, // no sessionId
      "1h",
    );
    expect(sign.ok).toBe(true);
    if (!sign.ok) return;
    const result = await useCase.execute({ token: sign.value });
    expect(result).toEqual({ ok: false, error: { kind: "invalid_token" } });
  });

  it("returns db_error when the session repo deleteById fails", async () => {
    // Wrap the in-memory session repo to force a deleteById error.
    // The InMemorySessionRepository always returns ok from deleteById
    // (idempotent), so we need a different repo that returns a real
    // db_error. We extend the InMemorySessionRepository and override.
    const { InMemorySessionRepository } = await import(
      "@/infra/repositories/InMemorySessionRepository"
    );
    class FlakySessionRepo extends InMemorySessionRepository {
      override async deleteById() {
        return { ok: false, error: { kind: "db_error", message: "pg down" } } as const;
      }
    }
    const flakyRepo = new FlakySessionRepo();
    const useCase = new Logout(flakyRepo, container.jwt);
    const sign = await container.jwt.sign(
      { sub: "u-test", sessionId: "sess-1", role: "student" },
      "1h",
    );
    expect(sign.ok).toBe(true);
    if (!sign.ok) return;
    const result = await useCase.execute({ token: sign.value });
    expect(result).toEqual({ ok: false, error: { kind: "db_error", message: "pg down" } });
  });
});
