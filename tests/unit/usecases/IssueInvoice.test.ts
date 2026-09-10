/**
 * IssueInvoice tests — P0-02 (P4 PR-B).
 *
 * Flag gating, happy-path issuance with PDF storage, idempotency,
 * numbering sequence + conflict retry, and every error branch.
 */

import { describe, expect, it, beforeEach } from "vitest";
import { IssueInvoice } from "@/usecases/IssueInvoice";
import { InMemoryOrderRepository } from "@/infra/payment/InMemoryOrderRepository";
import { InMemoryUserRepository } from "@/infra/repositories/InMemoryUserRepository";
import { InMemoryCourseRepository } from "@/infra/repositories/InMemoryCourseRepository";
import { InMemoryInvoiceRepository } from "@/infra/repositories/inmemory/InMemoryInvoiceRepository";
import { InMemoryFileStorage } from "@/infra/storage/InMemoryFileStorage";
import { InMemoryIdGenerator } from "@/infra/system/InMemoryIdGenerator";
import { FixedClock } from "@/ports/system/Clock";
import type { InvoiceRenderer, InvoiceRenderInput } from "@/ports/rendering/InvoiceRenderer";
import { createCourse } from "@/domain/entities/Course";
import type { Course } from "@/domain/entities/Course";
import { Result } from "@/domain/shared/Result";

class StubInvoiceRenderer implements InvoiceRenderer {
  inputs: InvoiceRenderInput[] = [];
  shouldThrow: Error | null = null;

  async render(input: InvoiceRenderInput): Promise<Buffer> {
    this.inputs.push(input);
    if (this.shouldThrow) throw this.shouldThrow;
    return Buffer.from(`pdf-for-${input.invoice.id}`);
  }
}

function makeCourse(overrides: Partial<Parameters<typeof createCourse>[0]> = {}): Course {
  const r = createCourse({
    id: "course_01",
    slug: "ppc-foundations",
    title: "PPC Foundations",
    tagline: "Learn PPC.",
    description: "A course.",
    priceMinor: 599900,
    currency: "PHP",
    curriculum: {
      sections: [
        {
          id: "s1",
          title: "Intro",
          lessons: [
            { id: "l1", title: "Welcome", type: "VIDEO" as const, content: { durationMinutes: 5 } },
          ],
        },
      ],
    },
    status: "PUBLISHED",
    displayOrder: 0,
    createdAt: new Date("2025-01-01"),
    ...overrides,
  } as Parameters<typeof createCourse>[0]);
  if (Result.isErr(r)) throw new Error("bad fixture: " + JSON.stringify(r.error));
  return r.value;
}

describe("IssueInvoice", () => {
  let orderRepo: InMemoryOrderRepository;
  let userRepo: InMemoryUserRepository;
  let courseRepo: InMemoryCourseRepository;
  let invoiceRepo: InMemoryInvoiceRepository;
  let renderer: StubInvoiceRenderer;
  let fileStorage: InMemoryFileStorage;
  let useCase: IssueInvoice;

  const USER_ID = "user_01";
  const COURSE_ID = "course_01";

  beforeEach(async () => {
    orderRepo = new InMemoryOrderRepository();
    userRepo = new InMemoryUserRepository();
    courseRepo = new InMemoryCourseRepository();
    invoiceRepo = new InMemoryInvoiceRepository();
    renderer = new StubInvoiceRenderer();
    fileStorage = new InMemoryFileStorage();
    userRepo.seed([
      {
        id: USER_ID,
        email: "student@example.com",
        passwordHash: "hash",
        firstName: "Maria",
        lastName: "Santos",
      },
    ]);
    courseRepo.seed([makeCourse()]);
    useCase = new IssueInvoice({
      orderRepo,
      userRepo,
      courseRepo,
      invoiceRepo,
      renderer,
      fileStorage,
      idGen: new InMemoryIdGenerator(),
      clock: new FixedClock(new Date("2026-03-01T00:00:00Z")),
      invoicingEnabled: true,
    });
  });

  async function seedPaidOrder(id: string, totalMinor = 599900): Promise<void> {
    await orderRepo.seedPaidOrder({ id, userId: USER_ID, courseId: COURSE_ID, totalMinor });
  }

  it("refuses to issue when the flag is off", async () => {
    await seedPaidOrder("ord_1");
    const disabled = new IssueInvoice({
      orderRepo,
      userRepo,
      courseRepo,
      invoiceRepo,
      renderer,
      fileStorage,
      idGen: new InMemoryIdGenerator(),
      clock: new FixedClock(new Date("2026-03-01T00:00:00Z")),
      invoicingEnabled: false,
    });
    const result = await disabled.execute({ orderId: "ord_1" });
    expect(result).toEqual({ ok: false, error: { kind: "invoicing_disabled" } });
    expect(renderer.inputs).toHaveLength(0);
  });

  it("issues an invoice with the year's first number and stores its PDF", async () => {
    await seedPaidOrder("ord_1");
    const result = await useCase.execute({ orderId: "ord_1" });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.alreadyIssued).toBe(false);
    const invoice = result.invoice;
    expect(invoice.invoiceNumber).toBe("INV-2026-00001");
    expect(invoice.status).toBe("ISSUED");
    expect(invoice.totalMinor).toBe(599900);
    expect(invoice.lineItems).toHaveLength(1);
    expect(invoice.lineItems[0]?.description).toBe("PPC Foundations");
    expect(invoice.pdfUrl).toBe("https://fake-storage.test/invoices/" + invoice.id + ".pdf");
    expect(fileStorage.has(`invoices/${invoice.id}.pdf`)).toBe(true);
    expect(renderer.inputs).toHaveLength(1);
    expect(renderer.inputs[0]?.buyer.firstName).toBe("Maria");
    expect(renderer.inputs[0]?.courseTitle).toBe("PPC Foundations");
  });

  it("snapshots provided BIR details", async () => {
    await seedPaidOrder("ord_1");
    const result = await useCase.execute({
      orderId: "ord_1",
      bir: { tin: "123-456-789-000", businessName: "Santos VA Services", city: "Davao" },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.invoice.bir.tin).toBe("123-456-789-000");
    expect(result.invoice.bir.businessName).toBe("Santos VA Services");
    expect(result.invoice.bir.addressLine1).toBeNull();
  });

  it("returns the existing invoice on replay without double-issuing", async () => {
    await seedPaidOrder("ord_1");
    const first = await useCase.execute({ orderId: "ord_1" });
    expect(first.ok).toBe(true);
    const second = await useCase.execute({ orderId: "ord_1" });
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.alreadyIssued).toBe(true);
    const listed = await invoiceRepo.listByUser(USER_ID);
    expect(listed.ok && listed.value).toHaveLength(1);
    expect(renderer.inputs).toHaveLength(1);
  });

  it("sequences numbers within the year", async () => {
    await seedPaidOrder("ord_1");
    await seedPaidOrder("ord_2");
    const first = await useCase.execute({ orderId: "ord_1" });
    const second = await useCase.execute({ orderId: "ord_2" });
    expect(first.ok && first.invoice.invoiceNumber).toBe("INV-2026-00001");
    expect(second.ok && second.invoice.invoiceNumber).toBe("INV-2026-00002");
  });

  it("retries once on a number conflict", async () => {
    await seedPaidOrder("ord_1");
    let calls = 0;
    const realCreate = invoiceRepo.create.bind(invoiceRepo);
    invoiceRepo.create = (async (invoice) => {
      calls += 1;
      if (calls === 1) {
        return Result.err({
          kind: "db_error",
          message: 'Unique constraint failed on the fields: ("invoiceNumber")',
        });
      }
      return realCreate(invoice);
    }) as typeof invoiceRepo.create;

    const result = await useCase.execute({ orderId: "ord_1" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.invoice.invoiceNumber).toBe("INV-2026-00002");
  });

  it("returns order_not_found for an unknown order", async () => {
    const result = await useCase.execute({ orderId: "ord_missing" });
    expect(result).toEqual({ ok: false, error: { kind: "order_not_found" } });
  });

  it("returns order_not_paid for an unpaid order", async () => {
    await orderRepo.seedPendingOrder({
      id: "ord_pending",
      userId: USER_ID,
      courseId: COURSE_ID,
      paymongoPaymentId: "cs_1",
      paymongoCheckoutUrl: "https://checkout.paymongo.com/cs_1",
    });
    const result = await useCase.execute({ orderId: "ord_pending" });
    expect(result).toEqual({ ok: false, error: { kind: "order_not_paid" } });
  });

  it("returns user_not_found when the buyer is gone", async () => {
    await orderRepo.seedPaidOrder({ id: "ord_1", userId: "ghost", courseId: COURSE_ID });
    const result = await useCase.execute({ orderId: "ord_1" });
    expect(result).toEqual({ ok: false, error: { kind: "user_not_found" } });
  });

  it("returns course_not_found when the course is gone", async () => {
    await orderRepo.seedPaidOrder({ id: "ord_1", userId: USER_ID, courseId: "ghost" });
    const result = await useCase.execute({ orderId: "ord_1" });
    expect(result).toEqual({ ok: false, error: { kind: "course_not_found" } });
  });

  it("maps renderer throws to render_error", async () => {
    await seedPaidOrder("ord_1");
    renderer.shouldThrow = new Error("font missing");
    const result = await useCase.execute({ orderId: "ord_1" });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("render_error");
  });

  it("maps storage failures to upload_failed", async () => {
    await seedPaidOrder("ord_1");
    const failing = new InMemoryFileStorage();
    failing.upload = async () => Result.err({ kind: "upload_failed", message: "blob down" });
    const useCaseWithFailingStorage = new IssueInvoice({
      orderRepo,
      userRepo,
      courseRepo,
      invoiceRepo,
      renderer,
      fileStorage: failing,
      idGen: new InMemoryIdGenerator(),
      clock: new FixedClock(new Date("2026-03-01T00:00:00Z")),
      invoicingEnabled: true,
    });
    const result = await useCaseWithFailingStorage.execute({ orderId: "ord_1" });
    expect(result).toEqual({
      ok: false,
      error: { kind: "upload_failed", message: "blob down" },
    });
  });
});
