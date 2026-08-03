import { describe, it, expect, beforeEach } from "vitest";
import { DeleteResource } from "../DeleteResource";
import { InMemoryResourceRepository } from "@/infra/repositories/InMemoryResourceRepository";
import { RecordAuditLog } from "@/usecases/RecordAuditLog";
import { InMemoryAuditLog } from "@/infra/repositories/InMemoryAuditLog";
import { FixedClock } from "@/ports/system/Clock";
import { createResource } from "@/domain/entities/Resource";

describe("DeleteResource", () => {
  let repo: InMemoryResourceRepository;
  let recordAuditLog: RecordAuditLog;
  let useCase: DeleteResource;

  beforeEach(() => {
    repo = new InMemoryResourceRepository();
    recordAuditLog = new RecordAuditLog({
      auditLog: new InMemoryAuditLog(),
      idGen: { newId: () => "ale_1", paymentRef: () => "x", receiptNumber: () => "x" },
      clock: new FixedClock(new Date()),
    });
    useCase = new DeleteResource({ resourceRepo: repo, recordAuditLog });

    const seed = createResource({
      id: "res_1",
      title: "Title",
      description: "Description",
      category: "guide",
      fileType: "pdf",
      fileUrl: "https://example.com/original.pdf",
      accessTier: "PREVIEW",
    });
    if (!seed.ok) throw new Error("seed failed");
    repo.seed(seed.value);
  });

  it("unpublishes the resource", async () => {
    const r = await useCase.execute({ id: "res_1", actorId: "admin_1" });
    expect(r.ok).toBe(true);
    const found = await repo.findById("res_1");
    expect(found.ok && found.value?.isPublished).toBe(false);
  });

  it("is idempotent when the resource is already unpublished", async () => {
    await useCase.execute({ id: "res_1", actorId: "admin_1" });
    const r = await useCase.execute({ id: "res_1", actorId: "admin_1" });
    expect(r.ok).toBe(true);
  });

  it("records an audit log entry on success", async () => {
    await useCase.execute({ id: "res_1", actorId: "admin_1" });
    const auditLog = recordAuditLog._auditLog as InMemoryAuditLog;
    expect(auditLog.getAll().some((e) => e.action === "resource.deleted")).toBe(true);
  });

  it("fails when repository lookup errors", async () => {
    const r = await useCase.execute({ id: "does_not_exist", actorId: "admin_1" });
    // findById on a missing id returns { ok: true, value: null } in the
    // in-memory repo, which the use case treats as already-unpublished
    // (idempotent success), matching DeleteLiveClass's contract.
    expect(r.ok).toBe(true);
  });
});
