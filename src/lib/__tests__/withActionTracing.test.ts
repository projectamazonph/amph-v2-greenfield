/**
 * withActionTracing tests — STORY-052.
 */

import { describe, it, expect } from "vitest";
import { withActionTracing } from "../withActionTracing";
import { TestLogger } from "@/infra/observability/TestLogger";

describe("withActionTracing", () => {
  it("logs start and success for a happy path", async () => {
    const logger = new TestLogger();
    const action = withActionTracing(
      async (x: number) => x * 2,
      { logger, actionName: "double", userId: "u1" },
    );

    const result = await action(21);
    expect(result).toBe(42);
    expect(logger.entries.map((e) => e.message)).toEqual([
      "action.start",
      "action.success",
    ]);
    expect(logger.entries[1]?.context).toMatchObject({
      action: "double",
      userId: "u1",
    });
  });

  it("logs errors without swallowing exceptions", async () => {
    const logger = new TestLogger();
    const action = withActionTracing(
      async () => {
        throw new Error("boom");
      },
      { logger, actionName: "failing" },
    );

    await expect(action()).rejects.toThrow("boom");
    expect(logger.entries.map((e) => e.message)).toEqual([
      "action.start",
      "action.error",
    ]);
    expect(logger.entries[1]?.context).toMatchObject({
      action: "failing",
      error: "boom",
    });
  });

  it("rethrows NEXT_REDIRECT as error but labels it redirect", async () => {
    const logger = new TestLogger();
    const action = withActionTracing(
      async () => {
        const err = new Error("NEXT_REDIRECT");
        throw err;
      },
      { logger, actionName: "redirect" },
    );

    await expect(action()).rejects.toThrow("NEXT_REDIRECT");
    expect(logger.entries[1]?.context).toMatchObject({
      error: "NEXT_REDIRECT",
    });
  });
});
