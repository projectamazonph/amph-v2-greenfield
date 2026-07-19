/**
 * TestLogger adapter tests — STORY-052.
 */

import { describe, it, expect } from "vitest";
import { TestLogger } from "../TestLogger";

describe("TestLogger", () => {
  it("buffers all log levels", () => {
    const logger = new TestLogger();
    logger.debug("d");
    logger.info("i");
    logger.warn("w");
    logger.error("e");

    expect(logger.entries.map((e) => e.level)).toEqual([
      "debug",
      "info",
      "warn",
      "error",
    ]);
  });

  it("stores message and context", () => {
    const logger = new TestLogger();
    logger.info("hello", { userId: "u1" });
    expect(logger.entries[0]).toEqual({
      level: "info",
      message: "hello",
      context: { userId: "u1" },
    });
  });

  it("clear removes all entries", () => {
    const logger = new TestLogger();
    logger.info("x");
    logger.clear();
    expect(logger.entries).toHaveLength(0);
  });

  it("child returns itself so logs stay in the same buffer", () => {
    const logger = new TestLogger();
    logger.child({ requestId: "r1" }).info("child log");
    expect(logger.entries[0]?.message).toBe("child log");
  });
});
