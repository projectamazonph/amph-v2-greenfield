/**
 * NodeCertificateHashGenerator test — STORY-010.
 *
 * Pure function: deterministic, format-validated.
 */

import { describe, it, expect } from "vitest";
import { NodeCertificateHashGenerator } from "@/infra/security/NodeCertificateHashGenerator";

const gen = new NodeCertificateHashGenerator();

describe("NodeCertificateHashGenerator", () => {
  it("produces a 64-char lowercase hex string", () => {
    const hash = gen.hash({
      id: "cert-1",
      userId: "user-1",
      courseId: "course-1",
      issuedAt: new Date("2026-01-01T00:00:00Z"),
    });
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is deterministic: same inputs produce the same hash", () => {
    const input = {
      id: "cert-1",
      userId: "user-1",
      courseId: "course-1",
      issuedAt: new Date("2026-01-01T00:00:00Z"),
    };
    const a = gen.hash(input);
    const b = gen.hash(input);
    expect(a).toBe(b);
  });

  it("produces different hashes for different ids", () => {
    const a = gen.hash({
      id: "cert-a",
      userId: "user-1",
      courseId: "course-1",
      issuedAt: new Date("2026-01-01T00:00:00Z"),
    });
    const b = gen.hash({
      id: "cert-b",
      userId: "user-1",
      courseId: "course-1",
      issuedAt: new Date("2026-01-01T00:00:00Z"),
    });
    expect(a).not.toBe(b);
  });

  it("produces different hashes for different issuedAt timestamps", () => {
    const a = gen.hash({
      id: "cert-1",
      userId: "user-1",
      courseId: "course-1",
      issuedAt: new Date("2026-01-01T00:00:00Z"),
    });
    const b = gen.hash({
      id: "cert-1",
      userId: "user-1",
      courseId: "course-1",
      issuedAt: new Date("2026-01-02T00:00:00Z"),
    });
    expect(a).not.toBe(b);
  });
});
