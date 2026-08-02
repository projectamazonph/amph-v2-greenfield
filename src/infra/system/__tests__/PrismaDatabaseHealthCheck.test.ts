import { describe, it, expect } from "vitest";
import { PrismaDatabaseHealthCheck } from "@/infra/system/PrismaDatabaseHealthCheck";

describe("PrismaDatabaseHealthCheck", () => {
  it("returns ok when the query succeeds", async () => {
    const db = { $queryRaw: async () => [{ "?column?": 1 }] };
    const check = new PrismaDatabaseHealthCheck(db as never);
    const result = await check.ping();
    expect(result.ok).toBe(true);
  });

  it("returns a db_error when the query throws", async () => {
    const db = {
      $queryRaw: async () => {
        throw new Error("connection refused");
      },
    };
    const check = new PrismaDatabaseHealthCheck(db as never);
    const result = await check.ping();
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("db_error");
    expect(result.error.message).toContain("connection refused");
  });
});
