import { describe, it, expect, beforeEach } from "vitest";
import { CreateResource } from "../CreateResource";
import type { CreateResourceInput_ } from "../CreateResource";
import { InMemoryResourceRepository } from "@/infra/repositories/InMemoryResourceRepository";
import { RecordAuditLog } from "@/usecases/RecordAuditLog";
import { InMemoryAuditLog } from "@/infra/repositories/InMemoryAuditLog";
import { FixedClock } from "@/ports/system/Clock";
import { createResource } from "@/domain/entities/Resource";

function makeInput(overrides: Partial<CreateResourceInput_> = {}): CreateResourceInput_ {
  return {
    id: "res_1",
    title: "STR Winner/Bleeder Scanner",
    description: "Flags winning and bleeding search terms automatically.",
    category: "automation_tool",
    fileType: "gsheet",
    fileUrl: "https://docs.google.com/spreadsheets/d/abc/copy",
    accessTier: "STARTER",
    actorId: "admin_1",
    ...overrides,
  };
}

describe("CreateResource", () => {
  let repo: InMemoryResourceRepository;
  let recordAuditLog: RecordAuditLog;
  let useCase: CreateResource;

  beforeEach(() => {
    repo = new InMemoryResourceRepository();
    recordAuditLog = new RecordAuditLog({
      auditLog: new InMemoryAuditLog(),
      idGen: { newId: () => "ale_1", paymentRef: () => "x", receiptNumber: () => "x" },
      clock: new FixedClock(new Date()),
    });
    useCase = new CreateResource({ resourceRepo: repo, recordAuditLog });
  });

  it("creates a resource and returns its id", async () => {
    const r = await useCase.execute(makeInput());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.resourceId).toBe("res_1");
  });

  it("persists the resource in the repository", async () => {
    await useCase.execute(makeInput({ id: "res_new" }));
    const found = await repo.findById("res_new");
    expect(found.ok && found.value?.title).toBe("STR Winner/Bleeder Scanner");
  });

  it("fails validation when title is empty", async () => {
    const r = await useCase.execute(makeInput({ title: "   " }));
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("invalid_title");
  });

  it("fails when repository returns db_error (id conflict)", async () => {
    const dup = createResource({
      id: "res_dup",
      title: "Dup",
      description: "Dup",
      category: "guide",
      fileType: "pdf",
      fileUrl: "https://example.com/dup.pdf",
      accessTier: "PREVIEW",
    });
    if (!dup.ok) throw new Error("seed failed");
    repo.seed(dup.value);

    const r = await useCase.execute(makeInput({ id: "res_dup" }));
    expect(r.ok).toBe(false);
  });

  it("records an audit log entry on success", async () => {
    await useCase.execute(makeInput());
    const auditLog = recordAuditLog._auditLog as InMemoryAuditLog;
    const entries = auditLog.getAll();
    expect(entries.some((e) => e.action === "resource.created")).toBe(true);
  });

  it("records a create_failed audit entry on validation failure", async () => {
    await useCase.execute(makeInput({ title: "" }));
    const auditLog = recordAuditLog._auditLog as InMemoryAuditLog;
    const entries = auditLog.getAll();
    expect(entries.some((e) => e.action === "resource.create_failed")).toBe(true);
  });
});
