import { describe, it, expect, beforeEach } from "vitest";
import { RecordResourceDownload } from "../RecordResourceDownload";
import { InMemoryResourceRepository } from "@/infra/repositories/InMemoryResourceRepository";
import { RecordAuditLog } from "@/usecases/RecordAuditLog";
import { InMemoryAuditLog } from "@/infra/repositories/InMemoryAuditLog";
import { FixedClock } from "@/ports/system/Clock";
import { createResource, updateResource } from "@/domain/entities/Resource";
import { SilentLogger } from "@/infra/observability/SilentLogger";

describe("RecordResourceDownload", () => {
  let repo: InMemoryResourceRepository;
  let recordAuditLog: RecordAuditLog;
  let useCase: RecordResourceDownload;

  beforeEach(() => {
    repo = new InMemoryResourceRepository();
    recordAuditLog = new RecordAuditLog({
      auditLog: new InMemoryAuditLog(),
      idGen: { newId: () => "ale_1", paymentRef: () => "x", receiptNumber: () => "x" },
      clock: new FixedClock(new Date()),
      logger: new SilentLogger(),
    });
    useCase = new RecordResourceDownload({ resourceRepo: repo, recordAuditLog });

    const starter = createResource({
      id: "res_starter",
      title: "Starter template",
      description: "d",
      category: "template",
      fileType: "docx",
      fileUrl: "https://example.com/starter.docx",
      accessTier: "STARTER",
    });
    if (!starter.ok) throw new Error("seed failed");
    repo.seed(starter.value);
  });

  it("returns the fileUrl and increments the download count when access is sufficient", async () => {
    const r = await useCase.execute({
      resourceId: "res_starter",
      userId: "user_1",
      subscriptionTier: "PRO",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.fileUrl).toBe("https://example.com/starter.docx");

    const found = await repo.findById("res_starter");
    expect(found.ok && found.value?.downloadCount).toBe(1);
  });

  it("denies access when the subscription tier is insufficient", async () => {
    const r = await useCase.execute({
      resourceId: "res_starter",
      userId: "user_1",
      subscriptionTier: "FREE",
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("access_denied");

    const found = await repo.findById("res_starter");
    expect(found.ok && found.value?.downloadCount).toBe(0);
  });

  it("returns not_found for an unknown resource", async () => {
    const r = await useCase.execute({
      resourceId: "does_not_exist",
      userId: "user_1",
      subscriptionTier: "PRO",
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("not_found");
  });

  it("returns not_published for an unpublished resource even with sufficient tier", async () => {
    const found = await repo.findById("res_starter");
    if (!found.ok || !found.value) throw new Error("seed missing");
    const unpublished = updateResource(found.value, { isPublished: false });
    if (!unpublished.ok) throw new Error("update failed");
    await repo.update(unpublished.value);

    const r = await useCase.execute({
      resourceId: "res_starter",
      userId: "user_1",
      subscriptionTier: "PRO",
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("not_published");
  });

  it("records an audit log entry on successful download", async () => {
    await useCase.execute({
      resourceId: "res_starter",
      userId: "user_1",
      subscriptionTier: "PRO",
    });
    const auditLog = recordAuditLog._auditLog as InMemoryAuditLog;
    expect(auditLog.getAll().some((e) => e.action === "resource.downloaded")).toBe(true);
  });
});
