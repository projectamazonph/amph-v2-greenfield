/**
 * PinoLogger adapter tests — STORY-052.
 */

import { describe, it, expect } from "vitest";
import { PinoLogger } from "../PinoLogger";

function captureStdout(fn: () => void): string {
  const original = process.stdout.write.bind(process.stdout);
  let output = "";
  // @ts-expect-error — mocking stdout.write for the test
  process.stdout.write = (chunk: string) => {
    output += chunk;
    return true;
  };
  try {
    fn();
  } finally {
    // @ts-expect-error — restoring stdout.write
    process.stdout.write = original;
  }
  return output;
}

describe("PinoLogger", () => {
  it("logs info messages without throwing", () => {
    const logger = new PinoLogger("silent");
    expect(() => logger.info("hello", { userId: "u1" })).not.toThrow();
  });

  it("redacts password fields", () => {
    const logger = new PinoLogger("info");
    const output = captureStdout(() => {
      logger.info("login", { password: "secret123" });
    });
    expect(output).toContain("[REDACTED]");
    expect(output).not.toContain("secret123");
  });

  it("redacts nested token fields", () => {
    const logger = new PinoLogger("info");
    const output = captureStdout(() => {
      logger.info("request", { body: { token: "abc" } });
    });
    expect(output).toContain("[REDACTED]");
    expect(output).not.toContain("abc");
  });

  it("child logger preserves redaction", () => {
    const logger = new PinoLogger("info");
    const child = logger.child({ requestId: "r1" });
    const output = captureStdout(() => {
      child.warn("alert", { secret: "shh" });
    });
    expect(output).toContain("[REDACTED]");
    expect(output).not.toContain("shh");
  });
});
