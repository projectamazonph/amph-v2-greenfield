/**
 * InMemoryOAuthAccountRepository contract pins (P1-04).
 *
 * Identity uniqueness is global across users: the same provider
 * identity cannot link twice, even to two different users.
 */

import { describe, expect, it } from "vitest";
import { Result } from "@/domain/shared/Result";
import { createOAuthAccount, type OAuthAccount } from "@/domain/entities/OAuthAccount";
import { InMemoryOAuthAccountRepository } from "@/infra/repositories/inmemory/InMemoryOAuthAccountRepository";

function mustLink(params: {
  id: string;
  userId?: string;
  providerUserId?: string;
  createdAt?: Date;
}): OAuthAccount {
  const result = createOAuthAccount({
    id: params.id,
    userId: params.userId ?? "user-1",
    provider: "google",
    providerUserId: params.providerUserId ?? `google-${params.id}`,
    createdAt: params.createdAt,
  });
  if (Result.isErr(result)) throw new Error("test setup failed");
  return result.value;
}

describe("InMemoryOAuthAccountRepository", () => {
  it("round-trips a link through create and findByProvider", async () => {
    const repo = new InMemoryOAuthAccountRepository();
    const account = mustLink({ id: "oa-1" });

    expect(await repo.create(account)).toEqual(Result.ok(account));
    expect(await repo.findByProvider("google", "google-oa-1")).toEqual(Result.ok(account));
    expect(await repo.findByProvider("google", "ghost")).toEqual(Result.ok(null));
  });

  it("rejects the same provider identity for a second user", async () => {
    const repo = new InMemoryOAuthAccountRepository();
    await repo.create(mustLink({ id: "oa-1", providerUserId: "google-same" }));

    const duplicate = await repo.create(
      mustLink({ id: "oa-2", userId: "user-2", providerUserId: "google-same" }),
    );

    expect(Result.isErr(duplicate)).toBe(true);
  });

  it("lists a user's links oldest-first", async () => {
    const repo = new InMemoryOAuthAccountRepository();
    await repo.create(
      mustLink({ id: "oa-2", createdAt: new Date("2026-09-11T00:00:01Z") }),
    );
    await repo.create(
      mustLink({ id: "oa-1", createdAt: new Date("2026-09-11T00:00:00Z") }),
    );

    const listed = await repo.listByUser("user-1");

    if (Result.isErr(listed)) throw new Error("expected ok");
    expect(listed.value.map((row) => row.id)).toEqual(["oa-1", "oa-2"]);
  });

  it("deletes one provider link and reports a missing one", async () => {
    const repo = new InMemoryOAuthAccountRepository();
    await repo.create(mustLink({ id: "oa-1" }));

    expect(await repo.delete("user-1", "google")).toEqual(Result.ok(undefined));
    expect(await repo.findByProvider("google", "google-oa-1")).toEqual(Result.ok(null));
    expect(await repo.delete("user-1", "google")).toEqual(Result.err({ kind: "not_found" }));
  });

  it("returns not_found when updating a missing id", async () => {
    const repo = new InMemoryOAuthAccountRepository();

    expect(await repo.update(mustLink({ id: "ghost" }))).toEqual(
      Result.err({ kind: "not_found" }),
    );
  });
});
