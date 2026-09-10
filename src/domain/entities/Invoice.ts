/**
 * Invoice entity — P0-02 (P4 PR-B, BIR invoicing).
 *
 * A BIR sales invoice issued for a PAID order. Taxpayer details are
 * snapshotted at issuance so later edits to the buyer's profile never
 * rewrite a issued fiscal document. Totals are derived from the line
 * items: subtotal = sum(quantity * unitPrice), total = subtotal + tax.
 *
 * State machine:
 *   DRAFT → ISSUED → PAID
 *                → VOIDED
 *   DRAFT → VOIDED   (abandoned before issuance)
 *
 * Transition methods return `Result` instead of throwing, matching Order.
 *
 * Tax scope: taxMinor is accepted as-is and defaults to 0. The Academy's
 * VAT registration treatment is a finance decision, not a code default,
 * so this entity never invents a tax rate. The use case documents it.
 */

import { Result } from "@/domain/shared/Result";

export type InvoiceStatus = "DRAFT" | "ISSUED" | "PAID" | "VOIDED";

/** Human-readable number minted by the use case: "INV-2026-00001". */
export const INVOICE_NUMBER_PATTERN = /^INV-\d{4}-\d{5}$/;

export interface InvoiceLineItemInput {
  readonly description: string;
  readonly quantity: number;
  readonly unitPriceMinor: number;
}

export interface InvoiceLineItem extends InvoiceLineItemInput {
  readonly totalMinor: number;
}

export interface InvoiceBirSnapshot {
  readonly tin: string | null;
  readonly businessName: string | null;
  // Buyer-address capture is a follow-up profile story, so every
  // address field is nullable. An invoice issued without an address
  // is still a valid system record: it is keyed by userId/orderId and
  // names the buyer from the User record at render time.
  readonly addressLine1: string | null;
  readonly addressLine2: string | null;
  readonly city: string | null;
  readonly province: string | null;
  readonly postalCode: string | null;
}

export interface InvoiceCreateParams {
  readonly id: string;
  readonly orderId: string;
  readonly userId: string;
  readonly invoiceNumber: string;
  readonly issuedAt: Date;
  readonly dueAt: Date;
  readonly bir: InvoiceBirSnapshot;
  readonly lineItems: readonly InvoiceLineItemInput[];
  readonly taxMinor?: number;
  readonly currency?: string;
}

export interface InvoiceHydrateParams extends InvoiceCreateParams {
  readonly status: InvoiceStatus;
  readonly subtotalMinor: number;
  readonly taxMinor: number;
  readonly totalMinor: number;
  readonly currency: string;
  readonly pdfUrl: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export type InvoiceError =
  | { kind: "empty_line_items" }
  | { kind: "invalid_line_item"; message: string }
  | { kind: "invalid_number"; message: string }
  | { kind: "invalid_transition"; message: string };

export class Invoice {
  public readonly id: string;
  public readonly orderId: string;
  public readonly userId: string;
  public readonly invoiceNumber: string;
  public readonly issuedAt: Date;
  public readonly dueAt: Date;
  public readonly bir: InvoiceBirSnapshot;
  public readonly lineItems: readonly InvoiceLineItem[];
  public readonly subtotalMinor: number;
  public readonly taxMinor: number;
  public readonly totalMinor: number;
  public readonly currency: string;

  public status: InvoiceStatus;
  public pdfUrl: string | null;

  public readonly createdAt: Date;
  public updatedAt: Date;

  private constructor(params: InvoiceCreateParams | InvoiceHydrateParams) {
    this.id = params.id;
    this.orderId = params.orderId;
    this.userId = params.userId;
    this.invoiceNumber = params.invoiceNumber;
    this.issuedAt = params.issuedAt;
    this.dueAt = params.dueAt;
    this.bir = params.bir;

    const hydrated = "status" in params ? (params as InvoiceHydrateParams) : undefined;
    if (hydrated) {
      this.lineItems = Object.freeze(
        (params.lineItems as readonly InvoiceLineItemInput[]).map((item) => ({
          ...item,
          totalMinor: item.quantity * item.unitPriceMinor,
        })),
      );
      this.status = hydrated.status;
      this.subtotalMinor = hydrated.subtotalMinor;
      this.taxMinor = hydrated.taxMinor;
      this.totalMinor = hydrated.totalMinor;
      this.currency = hydrated.currency;
      this.pdfUrl = hydrated.pdfUrl;
      this.createdAt = hydrated.createdAt;
      this.updatedAt = hydrated.updatedAt;
      return;
    }

    const items = params.lineItems.map((item) => ({
      ...item,
      totalMinor: item.quantity * item.unitPriceMinor,
    }));
    this.lineItems = Object.freeze(items);
    this.status = "DRAFT";
    this.subtotalMinor = items.reduce((sum, item) => sum + item.totalMinor, 0);
    this.taxMinor = params.taxMinor ?? 0;
    this.totalMinor = this.subtotalMinor + this.taxMinor;
    this.currency = params.currency ?? "PHP";
    this.pdfUrl = null;
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  static create(params: InvoiceCreateParams): Result<Invoice, InvoiceError> {
    if (params.lineItems.length === 0) {
      return Result.err({ kind: "empty_line_items" });
    }
    for (const item of params.lineItems) {
      const itemError = validateLineItem(item);
      if (itemError) return Result.err(itemError);
    }
    if (!INVOICE_NUMBER_PATTERN.test(params.invoiceNumber)) {
      return Result.err({
        kind: "invalid_number",
        message: `Invoice number must match INV-YYYY-NNNNN, got "${params.invoiceNumber}".`,
      });
    }
    if (
      params.taxMinor !== undefined &&
      (!Number.isInteger(params.taxMinor) || params.taxMinor < 0)
    ) {
      return Result.err({
        kind: "invalid_line_item",
        message: "Tax must be a non-negative integer.",
      });
    }
    return Result.ok(new Invoice(params));
  }

  /** Reconstruct an Invoice from a persisted row. Infra layer only. */
  static hydrate(params: InvoiceHydrateParams): Invoice {
    return new Invoice(params);
  }

  /** DRAFT → ISSUED. The invoice becomes a fiscal document. */
  issue(): Result<void, InvoiceError> {
    if (this.status !== "DRAFT") {
      return Result.err({
        kind: "invalid_transition",
        message: `Cannot issue: invoice is ${this.status}. Can only issue from DRAFT.`,
      });
    }
    this.status = "ISSUED";
    this.updatedAt = new Date();
    return Result.ok(undefined);
  }

  /** ISSUED → PAID. */
  markPaid(): Result<void, InvoiceError> {
    if (this.status !== "ISSUED") {
      return Result.err({
        kind: "invalid_transition",
        message: `Cannot mark paid: invoice is ${this.status}. Can only mark paid from ISSUED.`,
      });
    }
    this.status = "PAID";
    this.updatedAt = new Date();
    return Result.ok(undefined);
  }

  /** DRAFT or ISSUED → VOIDED. PAID invoices are never voided here; refund first. */
  void(): Result<void, InvoiceError> {
    if (this.status !== "DRAFT" && this.status !== "ISSUED") {
      return Result.err({
        kind: "invalid_transition",
        message: `Cannot void: invoice is ${this.status}. Only DRAFT or ISSUED invoices can be voided.`,
      });
    }
    this.status = "VOIDED";
    this.updatedAt = new Date();
    return Result.ok(undefined);
  }

  /** Attach the stored PDF URL after rendering + upload. */
  attachPdf(pdfUrl: string): void {
    this.pdfUrl = pdfUrl;
    this.updatedAt = new Date();
  }
}

function validateLineItem(item: InvoiceLineItemInput): InvoiceError | null {
  if (!item.description.trim()) {
    return { kind: "invalid_line_item", message: "Line item description must not be blank." };
  }
  if (!Number.isInteger(item.quantity) || item.quantity < 1) {
    return {
      kind: "invalid_line_item",
      message: `Line item quantity must be a positive integer, got ${item.quantity}.`,
    };
  }
  if (!Number.isInteger(item.unitPriceMinor) || item.unitPriceMinor < 0) {
    return {
      kind: "invalid_line_item",
      message: `Line item unit price must be a non-negative integer, got ${item.unitPriceMinor}.`,
    };
  }
  return null;
}
