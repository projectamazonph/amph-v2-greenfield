/**
 * EmailVerificationEmail render test.
 * STORY-045: EmailSender port + React Email templates.
 */

import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { EmailVerificationEmail } from "@/infra/email/templates/EmailVerificationEmail";

describe("EmailVerificationEmail", () => {
  it("renders the recipient, CTA, and expiration", () => {
    const html = renderToStaticMarkup(
      EmailVerificationEmail({
        firstName: "Maria",
        verificationUrl: "https://amph.example.com/verify?token=abc",
        expiresInHours: 24,
      }),
    );

    expect(html).toContain("Maria");
    expect(html).toContain("Verify Email Address");
    expect(html).toContain("https://amph.example.com/verify?token=abc");
    expect(html).toContain("24 hours");
  });

  it("greets the user", () => {
    const html = renderToStaticMarkup(
      EmailVerificationEmail({
        firstName: "Maria",
        verificationUrl: "https://x.com",
        expiresInHours: 1,
      }),
    );
    expect(html).toContain("Welcome");
  });
});
