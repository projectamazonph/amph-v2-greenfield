/**
 * ReceiptEmail render test.
 * STORY-045: EmailSender port + React Email templates.
 */

import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ReceiptEmail } from "@/infra/email/templates/ReceiptEmail";

describe("ReceiptEmail", () => {
  it("renders the order number, course, amount, and CTA", () => {
    const html = renderToStaticMarkup(
      ReceiptEmail({
        firstName: "Maria",
        orderNumber: "AMPH-2026-000123",
        courseTitle: "Intro to Amazon FBA",
        amountMinor: 199900, // 1999.00 PHP
        currency: "PHP",
        paidAt: new Date("2026-07-18T00:00:00Z"),
        receiptUrl: "https://amph.example.com/receipts/AMPH-2026-000123",
      }),
    );

    expect(html).toContain("Maria");
    expect(html).toContain("AMPH-2026-000123");
    expect(html).toContain("Intro to Amazon FBA");
    expect(html).toMatch(/1,?999\.00/); // formatted PHP
    expect(html).toContain("View Receipt");
    expect(html).toContain("receipts/AMPH-2026-000123");
  });

  it("uses the AMPH Academy brand", () => {
    const html = renderToStaticMarkup(
      ReceiptEmail({
        firstName: "Test",
        orderNumber: "X",
        courseTitle: "Y",
        amountMinor: 0,
        currency: "PHP",
        paidAt: new Date(),
        receiptUrl: "https://x.com",
      }),
    );
    expect(html).toContain("PROJECT AMAZON PH ACADEMY");
  });
});
