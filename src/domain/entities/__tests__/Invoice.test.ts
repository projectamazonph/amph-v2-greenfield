/**
 * Invoice entity tests — P0-02 (P4 PR-B).
 *
 * Every branch: creation validation, totals derivation, and the full
 * DRAFT → ISSUED → PAID / VOIDED state machine.
 */

import { describe, expect, it } from "vitest";
import { Invoice } from "@/domain/entities/Invoice";
import type { InvoiceBirSnapshot, InvoiceCreateParams } from "@/domain/entities/Invoice";

const BIR: InvoiceBirSnapshot = {
  tin: "123-456-789-000",
  businessName: "Dela Cruz VA Services",
  addressLine1: "123 Mabini St",
  addressLine2: null,
  city: "Makati",
  province: "Metro Manila",
  postalCode: "1229",
};

function params(overrides: Partial<InvoiceCreateParams> = {}): InvoiceCreateParams {
  return {
    id: "inv_test_1",
    orderId: "ord_test_1",
    userId: "user_test_1",
    invoiceNumber: "INV-2026-00001",
    issuedAt: new Date("2026-03-01T00:00:00Z"),
    dueAt: new Date("2026-03-08T00:00:00Z"),
    bir: BIR,
    lineItems: [{ description: "PPC Foundations", quantity: 1, unitPriceMinor: 299_900 }],
    ...overrides,
  };
}

describe("Invoice.create", () => {
  it("derives totals from line items with zero tax by default", () => {
    const result = Invoice.create(params());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.status).toBe("DRAFT");
      expect(result.value.subtotalMinor).toBe(299_900);
      expect(result.value.taxMinor).toBe(0);
      expect(result.value.totalMinor).toBe(299_900);
      expect(result.value.currency).toBe("PHP");
      expect(result.value.pdfUrl).toBeNull();
      expect(result.value.lineItems).toEqual([
        {
          description: "PPC Foundations",
          quantity: 1,
          unitPriceMinor: 299_900,
          totalMinor: 299_900,
        },
      ]);
    }
  });

  it("adds explicit tax to the total", () => {
    const result = Invoice.create(params({ taxMinor: 35_988 }));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.totalMinor).toBe(299_900 + 35_988);
  });

  it("accepts an empty BIR snapshot (buyer address captured later)", () => {
    const result = Invoice.create(
      params({
        bir: {
          tin: null,
          businessName: null,
          addressLine1: null,
          addressLine2: null,
          city: null,
          province: null,
          postalCode: null,
        },
      }),
    );
    expect(result.ok).toBe(true);
  });

  it("rejects empty line items", () => {
    expect(Invoice.create(params({ lineItems: [] }))).toEqual({
      ok: false,
      error: { kind: "empty_line_items" },
    });
  });

  it("rejects a blank description", () => {
    const result = Invoice.create(
      params({ lineItems: [{ description: "  ", quantity: 1, unitPriceMinor: 100 }] }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe("invalid_line_item");
  });

  it.each([0, -1, 1.5])("rejects quantity %s", (quantity) => {
    const result = Invoice.create(
      params({ lineItems: [{ description: "Item", quantity, unitPriceMinor: 100 }] }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe("invalid_line_item");
  });

  it.each([-1, 10.5])("rejects unit price %s", (unitPriceMinor) => {
    const result = Invoice.create(
      params({ lineItems: [{ description: "Item", quantity: 1, unitPriceMinor }] }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe("invalid_line_item");
  });

  it("rejects a malformed invoice number", () => {
    const result = Invoice.create(params({ invoiceNumber: "001" }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe("invalid_number");
  });

  it("rejects negative tax", () => {
    const result = Invoice.create(params({ taxMinor: -1 }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe("invalid_line_item");
  });
});

describe("Invoice transitions", () => {
  it("issues from DRAFT and records payment from ISSUED", () => {
    const result = Invoice.create(params());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const invoice = result.value;
    expect(invoice.issue().ok).toBe(true);
    expect(invoice.status).toBe("ISSUED");
    expect(invoice.issue().ok).toBe(false);
    expect(invoice.markPaid().ok).toBe(true);
    expect(invoice.status).toBe("PAID");
  });

  it("voids from DRAFT and from ISSUED", () => {
    const draft = Invoice.create(params());
    expect(draft.ok).toBe(true);
    if (!draft.ok) return;
    expect(draft.value.void().ok).toBe(true);
    expect(draft.value.status).toBe("VOIDED");

    const issued = Invoice.create(params());
    expect(issued.ok).toBe(true);
    if (!issued.ok) return;
    expect(issued.value.issue().ok).toBe(true);
    expect(issued.value.void().ok).toBe(true);
    expect(issued.value.status).toBe("VOIDED");
  });

  it("refuses to void a PAID invoice", () => {
    const result = Invoice.create(params());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const invoice = result.value;
    expect(invoice.issue().ok).toBe(true);
    expect(invoice.markPaid().ok).toBe(true);
    const voided = invoice.void();
    expect(voided.ok).toBe(false);
    expect(invoice.status).toBe("PAID");
  });

  it("refuses to mark a DRAFT invoice paid", () => {
    const result = Invoice.create(params());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.markPaid().ok).toBe(false);
  });

  it("attaches the rendered PDF url", () => {
    const result = Invoice.create(params());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    result.value.attachPdf("https://cdn.example.com/inv-1.pdf");
    expect(result.value.pdfUrl).toBe("https://cdn.example.com/inv-1.pdf");
  });
});
