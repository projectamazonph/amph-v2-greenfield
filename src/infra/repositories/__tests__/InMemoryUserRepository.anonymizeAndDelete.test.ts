/**
 * InMemoryUserRepository.anonymizeAndDelete.test.ts — STORY-096, plus a
 * PR #272 review fix.
 *
 * Copilot's review on PR #272 flagged that anonymizeAndDelete() updated
 * emailIndex without enforcing the repository's uniqueness rule, unlike
 * PrismaUserRepository (which relies on the real unique constraint and
 * now explicitly maps P2002 to email_taken). This pins the fix.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryUserRepository } from "@/infra/repositories/InMemoryUserRepository";

describe("InMemoryUserRepository.anonymizeAndDelete", () => {
  let repo: InMemoryUserRepository;

  beforeEach(() => {
    repo = new InMemoryUserRepository();
  });

  it("returns not_found for a nonexistent user", async () => {
    const r = await repo.anonymizeAndDelete("ghost", "deleted-ghost@deleted.invalid");
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("not_found");
  });

  it("scrubs the profile and frees the original email for reuse", async () => {
    await repo.create({
      id: "u1",
      email: "student@example.com",
      passwordHash: "hash",
      firstName: "Jane",
      lastName: "Doe",
    });

    const r = await repo.anonymizeAndDelete("u1", "deleted-u1@deleted.invalid");
    expect(r.ok).toBe(true);

    const found = await repo.findById("u1");
    expect(found.ok && found.value.email).toBe("deleted-u1@deleted.invalid");

    // The original email is no longer taken.
    const exists = await repo.emailExists("student@example.com");
    expect(exists.ok && exists.value).toBe(false);
  });

  it("returns email_taken instead of silently overwriting another user's emailIndex entry", async () => {
    await repo.create({
      id: "u1",
      email: "student1@example.com",
      passwordHash: "hash",
      firstName: "Jane",
      lastName: "Doe",
    });
    await repo.create({
      id: "u2",
      email: "already-here@deleted.invalid",
      passwordHash: "hash",
      firstName: "John",
      lastName: "Roe",
    });

    const r = await repo.anonymizeAndDelete("u1", "already-here@deleted.invalid");
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("email_taken");

    // u1 is untouched: the collision must not have overwritten anything.
    const u1 = await repo.findById("u1");
    expect(u1.ok && u1.value.email).toBe("student1@example.com");
    // u2's email still resolves to u2, not u1.
    const byEmail = await repo.findByEmail("already-here@deleted.invalid");
    expect(byEmail.ok && byEmail.value.id).toBe("u2");
  });

  it("is idempotent when called twice on the same user with the same target email", async () => {
    await repo.create({
      id: "u1",
      email: "student@example.com",
      passwordHash: "hash",
      firstName: "Jane",
      lastName: "Doe",
    });

    const first = await repo.anonymizeAndDelete("u1", "deleted-u1@deleted.invalid");
    expect(first.ok).toBe(true);

    const second = await repo.anonymizeAndDelete("u1", "deleted-u1@deleted.invalid");
    expect(second.ok).toBe(true);
  });
});
