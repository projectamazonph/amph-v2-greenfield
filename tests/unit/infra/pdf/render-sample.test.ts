/**
 * One-off: render a sample PDF to /workspace/sample-certificate.pdf.
 * Run with:  npx vitest run tests/unit/infra/pdf/render-sample.test.ts
 *
 * Not part of the regular suite — this file is committed so you can
 * regenerate a sample PDF anytime by running the command above.
 */

import { it } from "vitest";
import { writeFileSync } from "node:fs";
import { createElement } from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { CertificateDocument } from "@/infra/pdf/CertificateDocument";
import type { CertificateRenderInput } from "@/ports/rendering/CertificateRenderer";

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

it("renders a sample certificate to /workspace/sample-certificate.pdf", async () => {
  const element = createElement(CertificateDocument, { input: INPUT });
  const buffer = await renderToBuffer(
    element as Parameters<typeof renderToBuffer>[0],
  );
  const outPath = "/workspace/sample-certificate.pdf";
  writeFileSync(outPath, buffer);
  // eslint-disable-next-line no-console
  console.log(`\n[render-sample] Wrote ${buffer.length} bytes to ${outPath}\n`);
});
