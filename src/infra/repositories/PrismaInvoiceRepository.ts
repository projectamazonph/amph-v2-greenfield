/**
 * PrismaInvoiceRepository — production adapter for IInvoiceRepository.
 *
 * P0-02 (P4 PR-B). Invoices are immutable fiscal documents once
 * issued: `update()` only persists status/pdfUrl transitions, never
 * rewrites line items or totals. Line items are written once via a
 * nested create and deleted only by cascade (see the
 * invoice_line_items FK).
 */

import { PrismaClient } from "@prisma/client";
import { Result } from "@/domain/shared/Result";
import { Invoice } from "@/domain/entities/Invoice";
import type { InvoiceStatus } from "@/domain/entities/Invoice";
import type { IInvoiceRepository, InvoiceError } from "@/ports/repositories/IInvoiceRepository";

interface InvoiceRow {
  id: string;
  orderId: string;
  userId: string;
  invoiceNumber: string;
  issuedAt: Date;
  dueAt: Date;
  status: string;
  birTin: string | null;
  businessName: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  province: string | null;
  postalCode: string | null;
  subtotalMinor: number;
  taxMinor: number;
  totalMinor: number;
  currency: string;
  pdfUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface InvoiceLineItemRow {
  description: string;
  quantity: number;
  unitPriceMinor: number;
}

type InvoiceRowWithItems = InvoiceRow & { lineItems: InvoiceLineItemRow[] };

const INVOICE_STATUSES: readonly string[] = ["DRAFT", "ISSUED", "PAID", "VOIDED"];

export class PrismaInvoiceRepository implements IInvoiceRepository {
  constructor(private readonly db: PrismaClient) {}

  async create(invoice: Invoice): Promise<Result<Invoice, InvoiceError>> {
    try {
      const row = await this.db.invoice.create({
        data: {
          id: invoice.id,
          orderId: invoice.orderId,
          userId: invoice.userId,
          invoiceNumber: invoice.invoiceNumber,
          issuedAt: invoice.issuedAt,
          dueAt: invoice.dueAt,
          status: invoice.status,
          birTin: invoice.bir.tin,
          businessName: invoice.bir.businessName,
          addressLine1: invoice.bir.addressLine1,
          addressLine2: invoice.bir.addressLine2,
          city: invoice.bir.city,
          province: invoice.bir.province,
          postalCode: invoice.bir.postalCode,
          subtotalMinor: invoice.subtotalMinor,
          taxMinor: invoice.taxMinor,
          totalMinor: invoice.totalMinor,
          currency: invoice.currency,
          pdfUrl: invoice.pdfUrl,
          lineItems: {
            create: invoice.lineItems.map((item) => ({
              description: item.description,
              quantity: item.quantity,
              unitPriceMinor: item.unitPriceMinor,
              totalMinor: item.totalMinor,
            })),
          },
        },
        include: { lineItems: true },
      });
      return Result.ok(this.mapRow(row));
    } catch (err: unknown) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async findById(id: string): Promise<Result<Invoice | null, InvoiceError>> {
    try {
      const row = await this.db.invoice.findUnique({
        where: { id },
        include: { lineItems: true },
      });
      if (!row) return Result.ok(null);
      return Result.ok(this.mapRow(row));
    } catch (err: unknown) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async findByOrderId(orderId: string): Promise<Result<Invoice | null, InvoiceError>> {
    try {
      const row = await this.db.invoice.findUnique({
        where: { orderId },
        include: { lineItems: true },
      });
      if (!row) return Result.ok(null);
      return Result.ok(this.mapRow(row));
    } catch (err: unknown) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async listByUser(userId: string): Promise<Result<readonly Invoice[], InvoiceError>> {
    try {
      const rows = await this.db.invoice.findMany({
        where: { userId },
        orderBy: { issuedAt: "desc" },
        include: { lineItems: true },
      });
      return Result.ok(rows.map((row) => this.mapRow(row)));
    } catch (err: unknown) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async countIssuedInYear(year: number): Promise<Result<number, InvoiceError>> {
    try {
      const count = await this.db.invoice.count({
        where: {
          status: { not: "VOIDED" },
          invoiceNumber: { startsWith: `INV-${year}-` },
        },
      });
      return Result.ok(count);
    } catch (err: unknown) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async update(invoice: Invoice): Promise<Result<Invoice, InvoiceError>> {
    try {
      const row = await this.db.invoice.update({
        where: { id: invoice.id },
        data: { status: invoice.status, pdfUrl: invoice.pdfUrl },
        include: { lineItems: true },
      });
      return Result.ok(this.mapRow(row));
    } catch (err: unknown) {
      if (err && typeof err === "object" && "code" in err && err.code === "P2025") {
        return Result.err({ kind: "not_found" });
      }
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  private mapRow(row: InvoiceRowWithItems): Invoice {
    if (!INVOICE_STATUSES.includes(row.status)) {
      throw new Error(`Invoice ${row.id} has an invalid persisted status: "${row.status}"`);
    }
    return Invoice.hydrate({
      id: row.id,
      orderId: row.orderId,
      userId: row.userId,
      invoiceNumber: row.invoiceNumber,
      issuedAt: row.issuedAt,
      dueAt: row.dueAt,
      status: row.status as InvoiceStatus,
      bir: {
        tin: row.birTin,
        businessName: row.businessName,
        addressLine1: row.addressLine1,
        addressLine2: row.addressLine2,
        city: row.city,
        province: row.province,
        postalCode: row.postalCode,
      },
      lineItems: row.lineItems.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unitPriceMinor: item.unitPriceMinor,
      })),
      subtotalMinor: row.subtotalMinor,
      taxMinor: row.taxMinor,
      totalMinor: row.totalMinor,
      currency: row.currency,
      pdfUrl: row.pdfUrl,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}
