/**
 * ReactPdfInvoiceRenderer — production adapter for InvoiceRenderer.
 *
 * P0-02 (P4 PR-B). Mirrors ReactPdfCertificateRenderer: wraps
 * @react-pdf/renderer's `renderToBuffer` with the InvoiceDocument
 * component. Throw contract per the port's JSDoc.
 */

import { createElement } from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import type { InvoiceRenderer, InvoiceRenderInput } from "@/ports/rendering/InvoiceRenderer";
import { InvoiceDocument } from "@/infra/pdf/InvoiceDocument";

export class ReactPdfInvoiceRenderer implements InvoiceRenderer {
  async render(input: InvoiceRenderInput): Promise<Buffer> {
    try {
      const element = createElement(InvoiceDocument, { input });
      return await renderToBuffer(element as Parameters<typeof renderToBuffer>[0]);
    } catch (err: unknown) {
      console.error("[ReactPdfInvoiceRenderer] Failed to render invoice PDF:", err);
      throw new Error(
        `Invoice PDF rendering failed: ${err instanceof Error ? err.message : String(err)}`,
        { cause: err },
      );
    }
  }
}
