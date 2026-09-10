/**
 * InvoiceRenderer port — renders an Invoice as a PDF buffer.
 *
 * P0-02 (P4 PR-B). Mirrors CertificateRenderer: the port takes
 * pre-fetched data (not IDs) so it stays pure — no IO, no repository
 * access. The IssueInvoice use case orchestrates the lookups.
 *
 * The adapter (infra/pdf/ReactPdfInvoiceRenderer.ts) is the only
 * place that imports @react-pdf/renderer.
 */

import type { Invoice } from "@/domain/entities/Invoice";

/** Minimal buyer shape the renderer needs. Avoids leaking the full User entity. */
export interface InvoiceRenderBuyer {
  readonly firstName: string;
  readonly lastName: string;
  readonly email: string;
}

export interface InvoiceRenderInput {
  readonly invoice: Invoice;
  readonly buyer: InvoiceRenderBuyer;
  readonly courseTitle: string;
}

export interface InvoiceRenderer {
  /**
   * Render the invoice as a PDF. Returns a Node Buffer of the
   * raw PDF bytes. The caller uploads the buffer to file storage
   * and persists the URL on the invoice.
   *
   * **Throw contract:** On any failure the implementation MUST throw
   * an `Error` whose `message` describes the failure and whose
   * `cause` wraps the original error. The use case layer converts
   * throws to `Result<_, render_error>`.
   */
  render(input: InvoiceRenderInput): Promise<Buffer> | never;
}
