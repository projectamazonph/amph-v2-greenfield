/**
 * ReactPdfCertificateRenderer integration test.
 *
 * STORY-042: React PDF renderer port + certificate PDF.
 *
 * Renders a real PDF using @react-pdf/renderer and asserts the buffer
 * is a valid PDF. This is the only test that exercises the production
 * adapter. Tagged as integration because it spins up the PDF library,
 * but kept in tests/unit/ since it has no external dependencies.
 *
 * Slow test (~50ms) — keep it small.
 */

import { describe, it, expect } from "vitest";
import { ReactPdfCertificateRenderer } from "@/infra/pdf/ReactPdfCertificateRenderer";
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

describe("ReactPdfCertificateRenderer", () => {
  it("renders a Buffer that starts with %PDF-", async () => {
    const renderer = new ReactPdfCertificateRenderer();
    const buffer = await renderer.render(INPUT);

    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(100);
    expect(buffer.toString("utf8", 0, 5)).toBe("%PDF-");
  });

  it("produces a non-empty body", async () => {
    const renderer = new ReactPdfCertificateRenderer();
    const buffer = await renderer.render(INPUT);

    // A real PDF should have a %%EOF marker somewhere in the tail.
    const tail = buffer.toString("utf8", Math.max(0, buffer.length - 100));
    expect(tail).toContain("%%EOF");
  });
});
