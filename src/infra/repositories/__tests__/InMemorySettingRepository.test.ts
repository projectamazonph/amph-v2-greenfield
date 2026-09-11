/**
 * InMemorySettingRepository contract pins (P1-05).
 *
 * Missing keys read as null, upsert replaces by key, listAll
 * orders by key, and soft-deleted rows stay invisible.
 */

import { describe, expect, it } from "vitest";
import { Result } from "@/domain/shared/Result";
import { createSetting } from "@/domain/entities/Setting";
import { InMemorySettingRepository } from "@/infra/repositories/inmemory/InMemorySettingRepository";

function mustCreate(key: string, value: unknown = "v") {
  const result = createSetting({ key, value, createdById: "admin-1" });
  if (Result.isErr(result)) throw new Error("test setup failed");
  return result.value;
}

describe("InMemorySettingRepository", () => {
  it("reads a missing key as null", async () => {
    const repo = new InMemorySettingRepository();

    expect(await repo.get("support_email")).toEqual(Result.ok(null));
  });

  it("round-trips upsert and get", async () => {
    const repo = new InMemorySettingRepository();
    await repo.upsert(mustCreate("support_email", "a@x"));
    await repo.upsert(mustCreate("support_email", "b@x"));

    const found = await repo.get("support_email");

    expect(Result.isOk(found)).toBe(true);
    if (Result.isOk(found) && found.value !== null) {
      expect(found.value.value).toBe("b@x");
    } else {
      throw new Error("expected a row");
    }
  });

  it("lists live rows ordered by key", async () => {
    const repo = new InMemorySettingRepository();
    await repo.upsert(mustCreate("zebra"));
    await repo.upsert(mustCreate("apple"));

    const listed = await repo.listAll();

    if (Result.isErr(listed)) throw new Error("expected ok");
    expect(listed.value.map((row) => row.key)).toEqual(["apple", "zebra"]);
  });

  it("hides soft-deleted rows", async () => {
    const repo = new InMemorySettingRepository();
    const row = mustCreate("support_email");
    await repo.upsert(row);
    await repo.upsert({ ...row, deletedAt: new Date() });

    expect(await repo.get("support_email")).toEqual(Result.ok(null));
    expect(await repo.listAll()).toEqual(Result.ok([]));
  });
});
