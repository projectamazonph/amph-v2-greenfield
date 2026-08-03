import { describe, it, expect, beforeEach } from "vitest";
import { UploadFile } from "../UploadFile";
import { InMemoryFileStorage } from "@/infra/storage/InMemoryFileStorage";

describe("UploadFile", () => {
  let storage: InMemoryFileStorage;
  let useCase: UploadFile;

  beforeEach(() => {
    storage = new InMemoryFileStorage();
    useCase = new UploadFile({ fileStorage: storage });
  });

  it("uploads a file and returns its url and key", async () => {
    const r = await useCase.execute({
      key: "resources/res_1/scanner.xlsx",
      data: Buffer.from("fake xlsx bytes"),
      contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.key).toBe("resources/res_1/scanner.xlsx");
    expect(r.value.url).toContain("resources/res_1/scanner.xlsx");
  });

  it("persists the uploaded bytes", async () => {
    await useCase.execute({
      key: "resources/res_2/guide.pdf",
      data: Buffer.from("hello"),
      contentType: "application/pdf",
    });
    expect(storage.has("resources/res_2/guide.pdf")).toBe(true);
    expect(storage.get("resources/res_2/guide.pdf")?.toString()).toBe("hello");
  });
});
