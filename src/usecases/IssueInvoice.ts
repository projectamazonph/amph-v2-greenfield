/**
 * IssueInvoice — P0-02 (P4 PR-B, BIR invoicing).
 *
 * Issues a BIR sales invoice for a PAID order and stores its PDF:
 *
 * Flow:
 *  1. Flag off → invoicing_disabled (no rows, no PDF, no-op for callers)
 *  2. Order must exist and be PAID → order_not_found / order_not_paid
 *  3. Idempotency: an existing invoice for the order is returned with
 *     alreadyIssued: true (webhook replays must never double-issue)
 *  4. Buyer (user) + course lookups → user_not_found / course_not_found
 *  5. Mint INV-YYYY-NNNNN from the year's non-voided count; on a
 *     unique-number conflict (concurrent issuance) retry once
 *  6. Create + issue the DRAFT entity → persist
 *  7. Render the PDF and upload to file storage → render_error / upload_failed
 *  8. Attach the PDF url and persist → return the invoice
 *
 * Money scope: one net line (course title × 1 at the order total;
 * discounts collapse into the net amount) and taxMinor 0. The tax
 * treatment is a finance decision, not a code default — this use case
 * never invents a VAT rate. Buyer-address capture is a follow-up
 * profile story; the BIR snapshot defaults to all-null and the PDF
 * says so plainly.
 *
 * SRP: one responsibility — turn a paid order into a stored invoice.
 */

import { Result } from "@/domain/shared/Result";
import { Invoice } from "@/domain/entities/Invoice";
import type { InvoiceBirSnapshot, InvoiceError } from "@/domain/entities/Invoice";
import type { IOrderRepository } from "@/ports/repositories/OrderRepository";
import type { UserRepository } from "@/ports/repositories/UserRepository";
import type { CourseRepository } from "@/ports/repositories/CourseRepository";
import type { IInvoiceRepository } from "@/ports/repositories/IInvoiceRepository";
import type { InvoiceRenderer } from "@/ports/rendering/InvoiceRenderer";
import type { IFileStorage } from "@/ports/storage/IFileStorage";
import type { IdGenerator } from "@/ports/system/IdGenerator";
import type { Clock } from "@/ports/system/Clock";

export interface IssueInvoiceInput {
  orderId: string;
  /**
   * Buyer-taxpayer snapshot. Defaults to all-null (webhook path:
   * buyer details not on file yet). A future admin path can pass
   * real BIR details; they are snapshotted, never re-read.
   */
  bir?: Partial<InvoiceBirSnapshot>;
}

export type IssueInvoiceError =
  | { kind: "invoicing_disabled" }
  | { kind: "order_not_found" }
  | { kind: "order_not_paid" }
  | { kind: "user_not_found" }
  | { kind: "course_not_found" }
  | { kind: "issue_failed"; message: string }
  | { kind: "render_error"; message: string }
  | { kind: "upload_failed"; message: string }
  | { kind: "db_error"; message: string };

export type IssueInvoiceOutput =
  { ok: true; invoice: Invoice; alreadyIssued: boolean } | { ok: false; error: IssueInvoiceError };

export interface IssueInvoiceDeps {
  orderRepo: IOrderRepository;
  userRepo: UserRepository;
  courseRepo: CourseRepository;
  invoiceRepo: IInvoiceRepository;
  renderer: InvoiceRenderer;
  fileStorage: IFileStorage;
  idGen: IdGenerator;
  clock: Clock;
  /**
   * Master switch, wired from INVOICING_ENABLED in the composition
   * root. Tests pass true/false explicitly.
   */
  invoicingEnabled: boolean;
}

const DUE_IN_DAYS = 7;

export class IssueInvoice {
  constructor(private readonly deps: IssueInvoiceDeps) {}

  async execute(input: IssueInvoiceInput): Promise<IssueInvoiceOutput> {
    const { orderRepo, userRepo, courseRepo, invoiceRepo, renderer, fileStorage, idGen, clock } =
      this.deps;

    // ── 1. Flag ───────────────────────────────────────────────
    if (!this.deps.invoicingEnabled) {
      return { ok: false, error: { kind: "invoicing_disabled" } };
    }

    // ── 2. Order must exist and be PAID ───────────────────────
    const orderResult = await orderRepo.findById(input.orderId);
    if (!orderResult.ok) {
      return orderResult.error.kind === "not_found"
        ? { ok: false, error: { kind: "order_not_found" } }
        : { ok: false, error: { kind: "db_error", message: orderResult.error.message } };
    }
    const order = orderResult.value;
    if (!order) return { ok: false, error: { kind: "order_not_found" } };
    if (!order.isPaid()) return { ok: false, error: { kind: "order_not_paid" } };

    // ── 3. Idempotency: one invoice per order ─────────────────
    const existingResult = await invoiceRepo.findByOrderId(order.id);
    if (!existingResult.ok) {
      return existingResult.error.kind === "not_found"
        ? { ok: false, error: { kind: "db_error", message: "Failed to fetch invoice" } }
        : { ok: false, error: { kind: "db_error", message: existingResult.error.message } };
    }
    if (existingResult.value) {
      return { ok: true, invoice: existingResult.value, alreadyIssued: true };
    }

    // ── 4. Buyer + course ─────────────────────────────────────
    const userResult = await userRepo.findById(order.userId);
    if (!userResult.ok) {
      if (userResult.error.kind === "not_found") {
        return { ok: false, error: { kind: "user_not_found" } };
      }
      if (userResult.error.kind === "db_error") {
        return { ok: false, error: { kind: "db_error", message: userResult.error.message } };
      }
      return { ok: false, error: { kind: "db_error", message: "Failed to fetch user" } };
    }
    const user = userResult.value;
    if (!user) return { ok: false, error: { kind: "user_not_found" } };

    const courseResult = await courseRepo.findById(order.courseId);
    if (!courseResult.ok) {
      if (courseResult.error.kind === "not_found") {
        return { ok: false, error: { kind: "course_not_found" } };
      }
      if (courseResult.error.kind === "db_error") {
        return { ok: false, error: { kind: "db_error", message: courseResult.error.message } };
      }
      return { ok: false, error: { kind: "db_error", message: "Failed to fetch course" } };
    }
    const course = courseResult.value;
    if (!course) return { ok: false, error: { kind: "course_not_found" } };

    // ── 5-6. Build, number, and persist ───────────────────────
    const issuedAt = clock.now();
    const year = issuedAt.getUTCFullYear();
    const bir = { ...emptySnapshot(), ...input.bir };
    const buildInvoice = (sequence: number) =>
      Invoice.create({
        id: idGen.newId(),
        orderId: order.id,
        userId: order.userId,
        invoiceNumber: formatNumber(year, sequence),
        issuedAt,
        dueAt: new Date(issuedAt.getTime() + DUE_IN_DAYS * 24 * 60 * 60 * 1000),
        bir,
        lineItems: [{ description: course.title, quantity: 1, unitPriceMinor: order.totalMinor }],
        taxMinor: 0,
        currency: order.currency,
      });

    const countResult = await invoiceRepo.countIssuedInYear(year);
    if (!countResult.ok) {
      return countResult.error.kind === "not_found"
        ? { ok: false, error: { kind: "db_error", message: "Failed to count invoices" } }
        : { ok: false, error: { kind: "db_error", message: countResult.error.message } };
    }

    let built = buildInvoice(countResult.value + 1);
    if (!built.ok) {
      return { ok: false, error: { kind: "issue_failed", message: describe(built.error) } };
    }
    let invoice = built.value;
    const issued = invoice.issue();
    if (!issued.ok) {
      return { ok: false, error: { kind: "issue_failed", message: describe(issued.error) } };
    }

    let created = await invoiceRepo.create(invoice);
    if (
      !created.ok &&
      created.error.kind === "db_error" &&
      isNumberConflict(created.error.message)
    ) {
      // Concurrent issuance minted the same number: retry once with
      // the next sequence. Anything else is a real failure.
      built = buildInvoice(countResult.value + 2);
      if (!built.ok) {
        return { ok: false, error: { kind: "issue_failed", message: describe(built.error) } };
      }
      invoice = built.value;
      const reissued = invoice.issue();
      if (!reissued.ok) {
        return { ok: false, error: { kind: "issue_failed", message: describe(reissued.error) } };
      }
      created = await invoiceRepo.create(invoice);
    }
    if (!created.ok) {
      const err = created.error;
      return {
        ok: false,
        error: {
          kind: "db_error",
          message: err.kind === "db_error" ? err.message : `Invoice create failed: ${err.kind}`,
        },
      };
    }
    invoice = created.value;

    // ── 7. Render + store the PDF ─────────────────────────────
    let buffer: Buffer;
    try {
      buffer = await renderer.render({
        invoice,
        buyer: { firstName: user.firstName, lastName: user.lastName, email: user.email },
        courseTitle: course.title,
      });
    } catch (err: unknown) {
      return {
        ok: false,
        error: { kind: "render_error", message: err instanceof Error ? err.message : String(err) },
      };
    }

    const uploaded = await fileStorage.upload({
      key: `invoices/${invoice.id}.pdf`,
      data: buffer,
      contentType: "application/pdf",
    });
    if (!uploaded.ok) {
      return { ok: false, error: { kind: "upload_failed", message: uploaded.error.message } };
    }

    // ── 8. Attach the URL and persist ─────────────────────────
    invoice.attachPdf(uploaded.value.url);
    const updated = await invoiceRepo.update(invoice);
    if (!updated.ok) {
      const err = updated.error;
      return {
        ok: false,
        error:
          err.kind === "not_found"
            ? { kind: "db_error", message: `Invoice ${invoice.id} vanished after create` }
            : { kind: "db_error", message: err.message },
      };
    }

    return { ok: true, invoice: updated.value, alreadyIssued: false };
  }
}

function emptySnapshot(): InvoiceBirSnapshot {
  return {
    tin: null,
    businessName: null,
    addressLine1: null,
    addressLine2: null,
    city: null,
    province: null,
    postalCode: null,
  };
}

function formatNumber(year: number, sequence: number): string {
  return `INV-${year}-${String(sequence).padStart(5, "0")}`;
}

function describe(error: InvoiceError): string {
  return "message" in error ? `${error.kind}: ${error.message}` : error.kind;
}

function isNumberConflict(message: string): boolean {
  return message.includes("invoiceNumber");
}
