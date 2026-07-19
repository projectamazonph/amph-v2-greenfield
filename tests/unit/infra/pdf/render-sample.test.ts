/**
 * One-off: render a sample PDF for visual inspection.
 * Run with: SAMPLE_OUTPUT_DIR=/some/path npx vitest run tests/unit/infra/pdf/render-sample.test.ts
 *
 * Writes sample-certificate.pdf to SAMPLE_OUTPUT_DIR. Not part of the
 * regular suite — skipped in CI by the absence of SAMPLE_OUTPUT_DIR.
 */

import { describe, it } from "vitest";
import { writeFileSync } from "node:fs";
import { createElement } from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { CertificateDocument } from "@/infra/pdf/CertificateDocument";
import type { CertificateRenderInput } from "@/ports/rendering/CertificateRenderer";

const SAMPLE_OUT = process.env.SAMPLE_OUTPUT_DIR;

const INPUT: CertificateRenderInput = {
  certificate: {
    id: "cert_demo_01",
    userId: "user_demo_01",
    courseId: "course_demo_01",
    verificationHash: "a".repeat(64),
    issuedAt: new Date("2026-07-18T00:00:00Z"),
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
    tagline: "Your first steps to selling on Amazon",
  },
};

describe("renders a sample certificate for visual inspection (skipped unless SAMPLE_OUTPUT_DIR is set)", () => {
  it.skipIf(!SAMPLE_OUT)("writes sample-certificate.pdf to SAMPLE_OUTPUT_DIR", async () => {
    const element = createElement(CertificateDocument, { input: INPUT });
    const buffer = await renderToBuffer(
      element as Parameters<typeof renderToBuffer>[0],
    );
    const outPath = `${SAMPLE_OUT}/sample-certificate.pdf`;
    writeFileSync(outPath, buffer);
    // eslint-disable-next-line no-console
    console.log(`\n[render-sample] Wrote ${buffer.length} bytes to ${outPath}\n`);
  });
});
