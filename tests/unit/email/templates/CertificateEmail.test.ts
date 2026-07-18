/**
 * CertificateEmail render test.
 * STORY-045: EmailSender port + React Email templates.
 */

import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { CertificateEmail } from "@/infra/email/templates/CertificateEmail";

const HASH = "a".repeat(64);

describe("CertificateEmail", () => {
  it("renders the recipient, course, hash, and verify CTA", () => {
    const html = renderToStaticMarkup(
      CertificateEmail({
        firstName: "Maria",
        courseTitle: "Intro to Amazon FBA",
        verificationHash: HASH,
        verifyUrl: `https://amph.example.com/certificates/${HASH}`,
      }),
    );

    expect(html).toContain("Maria");
    expect(html).toContain("Intro to Amazon FBA");
    expect(html).toContain(HASH);
    expect(html).toContain("View Public Certificate");
    expect(html).toContain(`certificates/${HASH}`);
  });

  it("celebrates the completion", () => {
    const html = renderToStaticMarkup(
      CertificateEmail({
        firstName: "X",
        courseTitle: "Y",
        verificationHash: HASH,
        verifyUrl: "https://x.com",
      }),
    );
    expect(html).toContain("Congratulations");
  });
});
