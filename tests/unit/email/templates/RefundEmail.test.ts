/**
 * RefundEmail render test.
 * STORY-045: EmailSender port + React Email templates.
 */

import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { RefundEmail } from "@/infra/email/templates/RefundEmail";

describe("RefundEmail", () => {
  it("renders the order, course, amount, and reason", () => {
    const html = renderToStaticMarkup(
      RefundEmail({
        firstName: "Maria",
        orderNumber: "AMPH-2026-000123",
        courseTitle: "Intro to Amazon FBA",
        amountMinor: 199900,
        currency: "PHP",
        refundedAt: new Date("2026-08-01T00:00:00Z"),
        reason: "30-day money-back guarantee",
      }),
    );

    expect(html).toContain("Maria");
    expect(html).toContain("AMPH-2026-000123");
    expect(html).toContain("Intro to Amazon FBA");
    expect(html).toMatch(/1,?999\.00/);
    expect(html).toContain("30-day money-back guarantee");
  });

  it("uses danger/red color for the refund amount", () => {
    const html = renderToStaticMarkup(
      RefundEmail({
        firstName: "X",
        orderNumber: "X",
        courseTitle: "X",
        amountMinor: 1000,
        currency: "PHP",
        refundedAt: new Date(),
        reason: "X",
      }),
    );
    expect(html).toContain("#DC2626");
  });
});
