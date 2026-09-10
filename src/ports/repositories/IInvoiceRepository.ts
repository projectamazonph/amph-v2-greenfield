/**
 * IInvoiceRepository — port for persisting and querying BIR invoices.
 *
 * P0-02 (P4 PR-B). Follows the IOrderRepository shape (entities in,
 * entities out) rather than the announcement input-DTO shape, because
 * the IssueInvoice use case builds and validates the Invoice entity
 * (totals, number format, state machine) before persisting.
 *
 * Implementations: PrismaInvoiceRepository (prod),
 * InMemoryInvoiceRepository (tests).
 *
 * ADR-014: every port method returns Result<T, E>. No exceptions
 * across boundaries.
 */

import type { Result } from "@/domain/shared/Result";
import type { Invoice } from "@/domain/entities/Invoice";

export type InvoiceError = { kind: "not_found" } | { kind: "db_error"; message: string };

export interface IInvoiceRepository {
  /**
   * Persist a new invoice with its line items.
   *
   * Errors: `db_error` — database failure, including a duplicate
   * invoiceNumber (unique constraint). The caller retries numbering
   * on a number conflict.
   * Idempotent: No.
   * Postconditions: the invoice is retrievable via findById and
   * findByOrderId with identical totals and line items.
   */
  create(invoice: Invoice): Promise<Result<Invoice, InvoiceError>>;

  /** Single invoice by id, or null when it does not exist. */
  findById(id: string): Promise<Result<Invoice | null, InvoiceError>>;

  /**
   * The invoice issued for an order, or null when none exists.
   * Orders carry at most one invoice — the use case checks this for
   * webhook idempotency, so this query must never return two rows.
   */
  findByOrderId(orderId: string): Promise<Result<Invoice | null, InvoiceError>>;

  /** All invoices for a user, newest first. */
  listByUser(userId: string): Promise<Result<readonly Invoice[], InvoiceError>>;

  /**
   * Count of ISSUED (non-voided) invoices whose number starts with
   * `INV-<year>-`. The use case derives the next sequence number as
   * count + 1. Approximate under concurrency — invoiceNumber stays
   * unique via the DB constraint and the caller retries once.
   */
  countIssuedInYear(year: number): Promise<Result<number, InvoiceError>>;

  /**
   * Persist status/pdfUrl changes on an existing invoice.
   * Errors: `not_found` — no invoice with this id exists.
   */
  update(invoice: Invoice): Promise<Result<Invoice, InvoiceError>>;
}
