/**
 * PasswordResetEmail render test.
 * STORY-045: EmailSender port + React Email templates.
 */

import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { PasswordResetEmail } from "@/infra/email/templates/PasswordResetEmail";

describe("PasswordResetEmail", () => {
  it("renders the recipient, CTA, and expiration", () => {
    const html = renderToStaticMarkup(
      PasswordResetEmail({
        firstName: "Maria",
        resetUrl: "https://amph.example.com/reset?token=xyz",
        expiresInMinutes: 30,
      }),
    );

    expect(html).toContain("Maria");
    expect(html).toContain("Reset Password");
    expect(html).toContain("https://amph.example.com/reset?token=xyz");
    expect(html).toContain("30 minutes");
  });

  it("warns the user if they did not request the reset", () => {
    const html = renderToStaticMarkup(
      PasswordResetEmail({
        firstName: "X",
        resetUrl: "https://x.com",
        expiresInMinutes: 10,
      }),
    );
    expect(html.toLowerCase()).toContain("didn"); // HTML escapes the apostrophe to &#x27;
  });
});
