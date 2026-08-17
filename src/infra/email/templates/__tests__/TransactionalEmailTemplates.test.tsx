import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { CertificateEmail } from "../CertificateEmail";
import { EmailVerificationEmail } from "../EmailVerificationEmail";
import { LiveClassReminderEmail } from "../LiveClassReminderEmail";
import { PasswordChangedEmail } from "../PasswordChangedEmail";
import { PasswordResetEmail } from "../PasswordResetEmail";
import { PaymentFailedEmail } from "../PaymentFailedEmail";
import { ReceiptEmail } from "../ReceiptEmail";
import { RefundEmail } from "../RefundEmail";
import { WelcomeEmail } from "../WelcomeEmail";

const verificationHash = "a".repeat(64);

const scenarios = [
  {
    name: "email verification",
    expected: ["Verify Email Address", "https://example.test/verify?token=abc"],
    render: () =>
      EmailVerificationEmail({
        firstName: "Maria",
        verificationUrl: "https://example.test/verify?token=abc",
        expiresInHours: 24,
      }),
  },
  {
    name: "password reset",
    expected: ["Reset Password", "https://example.test/reset?token=abc"],
    render: () =>
      PasswordResetEmail({
        firstName: "Maria",
        resetUrl: "https://example.test/reset?token=abc",
        expiresInMinutes: 30,
      }),
  },
  {
    name: "welcome",
    expected: ["Go to your dashboard", "https://example.test/dashboard"],
    render: () =>
      WelcomeEmail({ firstName: "Maria", dashboardUrl: "https://example.test/dashboard" }),
  },
  {
    name: "receipt",
    expected: ["View Receipt", "AMPH-2026-000123"],
    render: () =>
      ReceiptEmail({
        firstName: "Maria",
        orderNumber: "AMPH-2026-000123",
        courseTitle: "PPC Foundations",
        amountMinor: 199900,
        currency: "PHP",
        paidAt: new Date("2026-08-01T00:00:00Z"),
        receiptUrl: "https://example.test/receipt/1",
      }),
  },
  {
    name: "refund",
    expected: ["View your dashboard", "Customer requested"],
    render: () =>
      RefundEmail({
        firstName: "Maria",
        orderNumber: "AMPH-2026-000123",
        courseTitle: "PPC Foundations",
        amountMinor: 199900,
        currency: "PHP",
        refundedAt: new Date("2026-08-01T00:00:00Z"),
        reason: "Customer requested",
        dashboardUrl: "https://example.test/dashboard",
      }),
  },
  {
    name: "certificate",
    expected: ["View Public Certificate", verificationHash],
    render: () =>
      CertificateEmail({
        firstName: "Maria",
        courseTitle: "PPC Foundations",
        verificationHash,
        verifyUrl: "https://example.test/certificate/1",
      }),
  },
  {
    name: "live class reminder",
    expected: ["Join Live Class", "PPC Foundations live workshop"],
    render: () =>
      LiveClassReminderEmail({
        firstName: "Maria",
        classTitle: "PPC Foundations live workshop",
        startsAt: new Date("2026-08-01T15:00:00Z"),
        joinUrl: "https://example.test/live/1",
        minutesUntilStart: 30,
      }),
  },
  {
    name: "password changed",
    expected: ["Your password was changed", "contact support immediately"],
    render: () =>
      PasswordChangedEmail({ firstName: "Maria", changedAt: new Date("2026-08-01T00:00:00Z") }),
  },
  {
    name: "payment failed",
    expected: ["Try again", "https://example.test/checkout?courseSlug=ppc-foundations"],
    render: () =>
      PaymentFailedEmail({
        firstName: "Maria",
        courseTitle: "PPC Foundations",
        retryUrl: "https://example.test/checkout?courseSlug=ppc-foundations",
      }),
  },
] as const;

describe("transactional email templates", () => {
  it.each(scenarios)("renders polished HTML for $name", ({ expected, render }) => {
    const html = renderToStaticMarkup(render());

    expect(html).toContain("PROJECT AMAZON PH ACADEMY");
    expect(html).toContain("#FF6B35");
    for (const value of expected) {
      expect(html).toContain(value);
    }
  });
});
