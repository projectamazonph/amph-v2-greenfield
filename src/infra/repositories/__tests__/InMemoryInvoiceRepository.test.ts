/**
 * InMemoryInvoiceRepository tests — P0-02 (P4 PR-B).
 *
 * Pins the port postconditions the fake must honor: per-order
 * uniqueness, newest-first listing, year-scoped non-voided counts,
 * and update semantics.
 */

import { describe, expect, it, beforeEach } from "vitest";
import { InMemoryInvoiceRepository } from "@/infra/repositories/inmemory/InMemoryInvoiceRepository";
import { Invoice } from "@/domain/entities/Invoice";
import type { InvoiceBirSnapshot } from "@/domain/entities/Invoice";

const BIR: InvoiceBirSnapshot = {
  tin: null,
  businessName: null,
  addressLine1: null,
  addressLine2: null,
  city: null,
  province: null,
  postalCode: null,
};

function makeInvoice(overrides: {
  id: string;
  orderId: string;
  userId?: string;
  invoiceNumber: string;
  issuedAt?: Date;
}): Invoice {
  const result = Invoice.create({
    id: overrides.id,
    orderId: overrides.orderId,
    userId: overrides.userId ?? "user_01",
    invoiceNumber: overrides.invoiceNumber,
    issuedAt: overrides.issuedAt ?? new Date("2026-03-01T00:00:00Z"),
    dueAt: new Date("2026-03-08T00:00:00Z"),
    bir: BIR,
    lineItems: [{ description: "PPC Foundations", quantity: 1, unitPriceMinor: 599900 }],
  });
  if (!result.ok) throw new Error("bad fixture: " + JSON.stringify(result.error));
  const invoice = result.value;
  const issued = invoice.issue();
  if (!issued.ok) throw new Error("issue failed");
  return invoice;
}

describe("InMemoryInvoiceRepository", () => {
  let repo: InMemoryInvoiceRepository;

  beforeEach(() => {
    repo = new InMemoryInvoiceRepository();
  });

  it("round-trips create and findById", async () => {
    const invoice = makeInvoice({ id: "inv_1", orderId: "ord_1", invoiceNumber: "INV-2026-00001" });
    await repo.create(invoice);
    const found = await repo.findById("inv_1");
    expect(found.ok && found.value?.invoiceNumber).toBe("INV-2026-00001");
    const missing = await repo.findById("inv_missing");
    expect(missing.ok && missing.value).toBeNull();
  });

  it("rejects a second invoice for the same order", async () => {
    await repo.create(
      makeInvoice({ id: "inv_1", orderId: "ord_1", invoiceNumber: "INV-2026-00001" }),
    );
    const duplicate = await repo.create(
      makeInvoice({ id: "inv_2", orderId: "ord_1", invoiceNumber: "INV-2026-00002" }),
    );
    expect(duplicate.ok).toBe(false);
  });

  it("rejects a duplicate invoice number", async () => {
    await repo.create(
      makeInvoice({ id: "inv_1", orderId: "ord_1", invoiceNumber: "INV-2026-00001" }),
    );
    const duplicate = await repo.create(
      makeInvoice({ id: "inv_2", orderId: "ord_2", invoiceNumber: "INV-2026-00001" }),
    );
    expect(duplicate.ok).toBe(false);
    if (!duplicate.ok) expect(duplicate.error.message).toMatch(/invoiceNumber/);
  });

  it("finds the invoice for an order", async () => {
    await repo.create(
      makeInvoice({ id: "inv_1", orderId: "ord_1", invoiceNumber: "INV-2026-00001" }),
    );
    const found = await repo.findByOrderId("ord_1");
    expect(found.ok && found.value?.id).toBe("inv_1");
    const missing = await repo.findByOrderId("ord_missing");
    expect(missing.ok && missing.value).toBeNull();
  });

  it("lists a user's invoices newest first", async () => {
    await repo.create(
      makeInvoice({
        id: "inv_old",
        orderId: "ord_old",
        invoiceNumber: "INV-2026-00001",
        issuedAt: new Date("2026-01-05T00:00:00Z"),
      }),
    );
    await repo.create(
      makeInvoice({
        id: "inv_new",
        orderId: "ord_new",
        invoiceNumber: "INV-2026-00002",
        issuedAt: new Date("2026-04-05T00:00:00Z"),
      }),
    );
    await repo.create(
      makeInvoice({
        id: "inv_other",
        orderId: "ord_other",
        userId: "user_02",
        invoiceNumber: "INV-2026-00003",
      }),
    );
    const listed = await repo.listByUser("user_01");
    expect(listed.ok && listed.value.map((invoice) => invoice.id)).toEqual(["inv_new", "inv_old"]);
  });

  it("counts non-voided invoices per year", async () => {
    const voided = makeInvoice({ id: "inv_1", orderId: "ord_1", invoiceNumber: "INV-2026-00001" });
    expect(voided.void().ok).toBe(true);
    await repo.create(voided);
    await repo.create(
      makeInvoice({ id: "inv_2", orderId: "ord_2", invoiceNumber: "INV-2026-00002" }),
    );
    await repo.create(
      makeInvoice({
        id: "inv_prev",
        orderId: "ord_prev",
        invoiceNumber: "INV-2025-00001",
        issuedAt: new Date("2025-12-01T00:00:00Z"),
      }),
    );
    const current = await repo.countIssuedInYear(2026);
    expect(current.ok && current.value).toBe(1);
    const previous = await repo.countIssuedInYear(2025);
    expect(previous.ok && previous.value).toBe(1);
  });

  it("updates an existing invoice and reports not_found otherwise", async () => {
    const invoice = makeInvoice({ id: "inv_1", orderId: "ord_1", invoiceNumber: "INV-2026-00001" });
    await repo.create(invoice);
    invoice.attachPdf("https://cdn.example.com/inv.pdf");
    const updated = await repo.update(invoice);
    expect(updated.ok && updated.value?.pdfUrl).toBe("https://cdn.example.com/inv.pdf");

    const ghost = makeInvoice({
      id: "inv_ghost",
      orderId: "ord_ghost",
      invoiceNumber: "INV-2026-00009",
    });
    const missing = await repo.update(ghost);
    expect(missing).toEqual({ ok: false, error: { kind: "not_found" } });
  });
});
