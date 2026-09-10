/**
 * StaticInvoiceRenderer — test fake for InvoiceRenderer.
 *
 * P0-02 (P4 PR-B). Mirrors StaticCertificateRenderer: returns a
 * minimal valid-PDF-syntax buffer carrying a JSON payload so test
 * assertions can introspect what would have been rendered.
 */

import type { InvoiceRenderer, InvoiceRenderInput } from "@/ports/rendering/InvoiceRenderer";

export class StaticInvoiceRenderer implements InvoiceRenderer {
  async render(input: InvoiceRenderInput): Promise<Buffer> {
    const body = JSON.stringify({
      kind: "fake_pdf",
      invoiceId: input.invoice.id,
      invoiceNumber: input.invoice.invoiceNumber,
      buyerEmail: input.buyer.email,
      courseTitle: input.courseTitle,
      totalMinor: input.invoice.totalMinor,
    });
    return Buffer.from(`%PDF-1.4\n%${body}\n%%EOF\n`, "utf8");
  }
}
