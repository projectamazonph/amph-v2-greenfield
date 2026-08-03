import { describe, it, expect, beforeEach } from "vitest";
import { PurgeResource } from "../PurgeResource";
import { InMemoryResourceRepository } from "@/infra/repositories/InMemoryResourceRepository";
import { InMemoryFileStorage } from "@/infra/storage/InMemoryFileStorage";
import { RecordAuditLog } from "@/usecases/RecordAuditLog";
import { InMemoryAuditLog } from "@/infra/repositories/InMemoryAuditLog";
import { FixedClock } from "@/ports/system/Clock";
import { createResource } from "@/domain/entities/Resource";

describe("PurgeResource", () => {
  let repo: InMemoryResourceRepository;
  let fileStorage: InMemoryFileStorage;
  let recordAuditLog: RecordAuditLog;
  let useCase: PurgeResource;

  beforeEach(() => {
    repo = new InMemoryResourceRepository();
    fileStorage = new InMemoryFileStorage();
    recordAuditLog = new RecordAuditLog({
      auditLog: new InMemoryAuditLog(),
      idGen: { newId: () => "ale_1", paymentRef: () => "x", receiptNumber: () => "x" },
      clock: new FixedClock(new Date()),
    });
    useCase = new PurgeResource({ resourceRepo: repo, fileStorage, recordAuditLog });
  });

  it("removes the row entirely for a resource with an uploaded file, and deletes the file", async () => {
    await fileStorage.upload({
      key: "resources/res_1/scanner.xlsx",
      data: Buffer.from("x"),
      contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const seed = createResource({
      id: "res_1",
      title: "Title",
      description: "Description",
      category: "automation_tool",
      fileType: "xlsx",
      fileUrl: "https://fake-storage.test/resources/res_1/scanner.xlsx",
      fileKey: "resources/res_1/scanner.xlsx",
      accessTier: "PREVIEW",
    });
    if (!seed.ok) throw new Error("seed failed");
    repo.seed(seed.value);

    const r = await useCase.execute({ id: "res_1", actorId: "admin_1" });
    expect(r.ok).toBe(true);

    const found = await repo.findById("res_1");
    expect(found.ok && found.value).toBeNull();
    expect(fileStorage.has("resources/res_1/scanner.xlsx")).toBe(false);
  });

  it("removes the row without touching storage for an external link (no fileKey)", async () => {
    const seed = createResource({
      id: "res_2",
      title: "Title",
      description: "Description",
      category: "guide",
      fileType: "pdf",
      fileUrl: "https://drive.google.com/file/d/xyz",
      accessTier: "PREVIEW",
    });
    if (!seed.ok) throw new Error("seed failed");
    repo.seed(seed.value);

    const r = await useCase.execute({ id: "res_2", actorId: "admin_1" });
    expect(r.ok).toBe(true);
    const found = await repo.findById("res_2");
    expect(found.ok && found.value).toBeNull();
  });

  it("returns not_found for a missing resource", async () => {
    const r = await useCase.execute({ id: "does_not_exist", actorId: "admin_1" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("not_found");
  });

  it("records a purge_failed audit entry for a missing resource", async () => {
    await useCase.execute({ id: "does_not_exist", actorId: "admin_1" });
    const auditLog = recordAuditLog._auditLog as InMemoryAuditLog;
    expect(auditLog.getAll().some((e) => e.action === "resource.purge_failed")).toBe(true);
  });

  it("records an audit log entry on success", async () => {
    const seed = createResource({
      id: "res_3",
      title: "Title",
      description: "Description",
      category: "guide",
      fileType: "pdf",
      fileUrl: "https://drive.google.com/file/d/xyz",
      accessTier: "PREVIEW",
    });
    if (!seed.ok) throw new Error("seed failed");
    repo.seed(seed.value);

    await useCase.execute({ id: "res_3", actorId: "admin_1" });
    const auditLog = recordAuditLog._auditLog as InMemoryAuditLog;
    expect(auditLog.getAll().some((e) => e.action === "resource.purged")).toBe(true);
  });
});
