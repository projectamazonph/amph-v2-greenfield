/**
 * InMemoryInvoiceRepository — test fake for IInvoiceRepository.
 *
 * P0-02 (P4 PR-B). Stores Invoice entities in a Map, keyed by id.
 * Mirrors PrismaInvoiceRepository's contracts: orderId uniqueness
 * (at most one invoice per order), newest-first listByUser, and
 * year-scoped non-voided counts for numbering.
 */

import { Result } from "@/domain/shared/Result";
import type { Invoice } from "@/domain/entities/Invoice";
import type { IInvoiceRepository, InvoiceError } from "@/ports/repositories/IInvoiceRepository";

export class InMemoryInvoiceRepository implements IInvoiceRepository {
  private readonly rows = new Map<string, Invoice>();

  async create(invoice: Invoice): Promise<Result<Invoice, InvoiceError>> {
    for (const existing of this.rows.values()) {
      if (existing.invoiceNumber === invoice.invoiceNumber) {
        return Result.err({
          kind: "db_error",
          message: `Unique constraint failed on invoiceNumber: ${invoice.invoiceNumber}`,
        });
      }
      if (existing.orderId === invoice.orderId) {
        return Result.err({
          kind: "db_error",
          message: `Unique constraint failed on orderId: ${invoice.orderId}`,
        });
      }
    }
    this.rows.set(invoice.id, invoice);
    return Result.ok(invoice);
  }

  async findById(id: string): Promise<Result<Invoice | null, InvoiceError>> {
    return Result.ok(this.rows.get(id) ?? null);
  }

  async findByOrderId(orderId: string): Promise<Result<Invoice | null, InvoiceError>> {
    for (const invoice of this.rows.values()) {
      if (invoice.orderId === orderId) return Result.ok(invoice);
    }
    return Result.ok(null);
  }

  async listByUser(userId: string): Promise<Result<readonly Invoice[], InvoiceError>> {
    const invoices = Array.from(this.rows.values())
      .filter((invoice) => invoice.userId === userId)
      .sort((a, b) => b.issuedAt.getTime() - a.issuedAt.getTime());
    return Result.ok(invoices);
  }

  async countIssuedInYear(year: number): Promise<Result<number, InvoiceError>> {
    const prefix = `INV-${year}-`;
    let count = 0;
    for (const invoice of this.rows.values()) {
      if (invoice.status !== "VOIDED" && invoice.invoiceNumber.startsWith(prefix)) count += 1;
    }
    return Result.ok(count);
  }

  async update(invoice: Invoice): Promise<Result<Invoice, InvoiceError>> {
    if (!this.rows.has(invoice.id)) return Result.err({ kind: "not_found" });
    this.rows.set(invoice.id, invoice);
    return Result.ok(invoice);
  }

  /** Test helper: seed an invoice directly, bypassing the port. */
  seed(invoice: Invoice): void {
    this.rows.set(invoice.id, invoice);
  }

  /** Test helper: clear all rows. */
  clear(): void {
    this.rows.clear();
  }
}
