/**
 * Sample email renders for visual inspection.
 * Run with: npx vitest run tests/unit/email/templates/render-sample.test.ts
 *
 * Writes /workspace/sample-receipt.html, sample-cert.html, etc. for
 * visual inspection. Not part of the regular suite.
 */

import { it } from "vitest";
import { writeFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { ReceiptEmail } from "@/infra/email/templates/ReceiptEmail";
import { CertificateEmail } from "@/infra/email/templates/CertificateEmail";
import { RefundEmail } from "@/infra/email/templates/RefundEmail";
import { EmailVerificationEmail } from "@/infra/email/templates/EmailVerificationEmail";
import { PasswordResetEmail } from "@/infra/email/templates/PasswordResetEmail";
import { LiveClassReminderEmail } from "@/infra/email/templates/LiveClassReminderEmail";

it("writes sample emails to /workspace/sample-*.html", () => {
  const out = "/workspace";
  const samples = [
    { name: "sample-receipt", html: renderToStaticMarkup(ReceiptEmail({
      firstName: "Maria", orderNumber: "AMPH-2026-000123", courseTitle: "Intro to Amazon FBA",
      amountMinor: 199900, currency: "PHP", paidAt: new Date("2026-07-18"),
      receiptUrl: "https://amph.example.com/receipts/AMPH-2026-000123",
    }))},
    { name: "sample-cert", html: renderToStaticMarkup(CertificateEmail({
      firstName: "Maria", courseTitle: "Intro to Amazon FBA",
      verificationHash: "a".repeat(64),
      verifyUrl: "https://amph.example.com/certificates/" + "a".repeat(64),
    }))},
    { name: "sample-refund", html: renderToStaticMarkup(RefundEmail({
      firstName: "Maria", orderNumber: "AMPH-2026-000123", courseTitle: "Intro to Amazon FBA",
      amountMinor: 199900, currency: "PHP", refundedAt: new Date("2026-08-01"),
      reason: "30-day money-back guarantee",
    }))},
    { name: "sample-verify", html: renderToStaticMarkup(EmailVerificationEmail({
      firstName: "Maria", verificationUrl: "https://amph.example.com/verify?token=abc",
      expiresInHours: 24,
    }))},
    { name: "sample-reset", html: renderToStaticMarkup(PasswordResetEmail({
      firstName: "Maria", resetUrl: "https://amph.example.com/reset?token=xyz",
      expiresInMinutes: 30,
    }))},
    { name: "sample-reminder", html: renderToStaticMarkup(LiveClassReminderEmail({
      firstName: "Maria", classTitle: "PPC Deep Dive",
      startsAt: new Date("2026-08-01T15:00:00Z"),
      joinUrl: "https://amph.example.com/live/abc", minutesUntilStart: 15,
    }))},
  ];
  for (const s of samples) {
    writeFileSync(`${out}/${s.name}.html`, `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>${s.html}</body></html>`);
  }
});
