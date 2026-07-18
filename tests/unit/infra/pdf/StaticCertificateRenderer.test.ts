/**
 * StaticCertificateRenderer test — verifies the test fake.
 *
 * STORY-042: React PDF renderer port + certificate PDF.
 *
 * The fake must return a Buffer that:
 * 1. Starts with %PDF- (so byte-magic tests work)
 * 2. Is deterministic (same input = same output)
 * 3. Carries the certificate id somewhere in the body (so tests can
 *    assert the right cert was rendered)
 */

import { describe, it, expect } from "vitest";
import { StaticCertificateRenderer } from "@/infra/pdf/StaticCertificateRenderer";
import type { CertificateRenderInput } from "@/ports/rendering/CertificateRenderer";

const INPUT: CertificateRenderInput = {
  certificate: {
    id: "cert_test_01",
    userId: "user_01",
    courseId: "course_01",
    verificationHash: "a".repeat(64),
    issuedAt: new Date("2026-07-01T00:00:00Z"),
    revokedAt: null,
    revokedReason: null,
    status: "active",
  },
  user: {
    firstName: "Maria",
    lastName: "Santos",
    email: "maria@example.com",
  },
  course: {
    title: "Intro to Amazon FBA",
    tagline: "Your first steps",
  },
};

describe("StaticCertificateRenderer", () => {
  it("returns a Buffer", async () => {
    const renderer = new StaticCertificateRenderer();
    const buffer = await renderer.render(INPUT);
    expect(Buffer.isBuffer(buffer)).toBe(true);
  });

  it("starts with the %PDF- magic bytes", async () => {
    const renderer = new StaticCertificateRenderer();
    const buffer = await renderer.render(INPUT);
    const head = buffer.toString("utf8", 0, 5);
    expect(head).toBe("%PDF-");
  });

  it("is deterministic — same input produces identical output", async () => {
    const renderer = new StaticCertificateRenderer();
    const a = await renderer.render(INPUT);
    const b = await renderer.render(INPUT);
    expect(a.equals(b)).toBe(true);
  });

  it("embeds the certificate id in the body", async () => {
    const renderer = new StaticCertificateRenderer();
    const buffer = await renderer.render(INPUT);
    expect(buffer.toString("utf8")).toContain("cert_test_01");
  });
});
