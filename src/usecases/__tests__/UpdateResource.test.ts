import { describe, it, expect, beforeEach } from "vitest";
import { UpdateResource } from "../UpdateResource";
import { InMemoryResourceRepository } from "@/infra/repositories/InMemoryResourceRepository";
import { InMemoryFileStorage } from "@/infra/storage/InMemoryFileStorage";
import { RecordAuditLog } from "@/usecases/RecordAuditLog";
import { InMemoryAuditLog } from "@/infra/repositories/InMemoryAuditLog";
import { FixedClock } from "@/ports/system/Clock";
import { createResource } from "@/domain/entities/Resource";

describe("UpdateResource", () => {
  let repo: InMemoryResourceRepository;
  let fileStorage: InMemoryFileStorage;
  let recordAuditLog: RecordAuditLog;
  let useCase: UpdateResource;

  beforeEach(() => {
    repo = new InMemoryResourceRepository();
    fileStorage = new InMemoryFileStorage();
    recordAuditLog = new RecordAuditLog({
      auditLog: new InMemoryAuditLog(),
      idGen: { newId: () => "ale_1", paymentRef: () => "x", receiptNumber: () => "x" },
      clock: new FixedClock(new Date()),
    });
    useCase = new UpdateResource({ resourceRepo: repo, fileStorage, recordAuditLog });

    const seed = createResource({
      id: "res_1",
      title: "Original title",
      description: "Original description",
      category: "guide",
      fileType: "pdf",
      fileUrl: "https://example.com/original.pdf",
      accessTier: "PREVIEW",
    });
    if (!seed.ok) throw new Error("seed failed");
    repo.seed(seed.value);
  });

  it("updates a resource's fields", async () => {
    const r = await useCase.execute({
      id: "res_1",
      patch: { title: "New title", accessTier: "PRO" },
      actorId: "admin_1",
    });
    expect(r.ok).toBe(true);
    const found = await repo.findById("res_1");
    expect(found.ok && found.value?.title).toBe("New title");
    expect(found.ok && found.value?.accessTier).toBe("PRO");
  });

  it("unpublishes via patch", async () => {
    const r = await useCase.execute({
      id: "res_1",
      patch: { isPublished: false },
      actorId: "admin_1",
    });
    expect(r.ok).toBe(true);
    const found = await repo.findById("res_1");
    expect(found.ok && found.value?.isPublished).toBe(false);
  });

  it("fails when resource does not exist", async () => {
    const r = await useCase.execute({
      id: "res_missing",
      patch: { title: "x" },
      actorId: "admin_1",
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("not_found");
  });

  it("fails validation when patched title is blank", async () => {
    const r = await useCase.execute({
      id: "res_1",
      patch: { title: "   " },
      actorId: "admin_1",
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("invalid_title");
  });

  it("records an audit log entry on success", async () => {
    await useCase.execute({ id: "res_1", patch: { title: "New" }, actorId: "admin_1" });
    const auditLog = recordAuditLog._auditLog as InMemoryAuditLog;
    expect(auditLog.getAll().some((e) => e.action === "resource.updated")).toBe(true);
  });

  it("deletes the old uploaded file from storage when the file is replaced", async () => {
    await fileStorage.upload({
      key: "resources/res_1/old.pdf",
      data: Buffer.from("old"),
      contentType: "application/pdf",
    });
    await useCase.execute({
      id: "res_1",
      patch: {
        fileUrl: "https://fake-storage.test/resources/res_1/old.pdf",
        fileKey: "resources/res_1/old.pdf",
      },
      actorId: "admin_1",
    });

    const r = await useCase.execute({
      id: "res_1",
      patch: {
        fileUrl: "https://fake-storage.test/resources/res_1/new.pdf",
        fileKey: "resources/res_1/new.pdf",
      },
      actorId: "admin_1",
    });
    expect(r.ok).toBe(true);
    expect(fileStorage.has("resources/res_1/old.pdf")).toBe(false);
  });

  it("does not touch storage when fileKey is unchanged", async () => {
    await fileStorage.upload({
      key: "resources/res_1/same.pdf",
      data: Buffer.from("same"),
      contentType: "application/pdf",
    });
    await useCase.execute({
      id: "res_1",
      patch: {
        fileUrl: "https://fake-storage.test/resources/res_1/same.pdf",
        fileKey: "resources/res_1/same.pdf",
      },
      actorId: "admin_1",
    });

    await useCase.execute({ id: "res_1", patch: { title: "Retitled" }, actorId: "admin_1" });
    expect(fileStorage.has("resources/res_1/same.pdf")).toBe(true);
  });

  it("does not attempt storage cleanup when the old file was an external link (no fileKey)", async () => {
    const r = await useCase.execute({
      id: "res_1",
      patch: {
        fileUrl: "https://storage.example.com/resources/res_1/new.pdf",
        fileKey: "resources/res_1/new.pdf",
      },
      actorId: "admin_1",
    });
    expect(r.ok).toBe(true);
  });
});
