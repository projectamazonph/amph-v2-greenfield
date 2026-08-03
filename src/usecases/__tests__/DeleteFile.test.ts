import { describe, it, expect, beforeEach } from "vitest";
import { DeleteFile } from "../DeleteFile";
import { InMemoryFileStorage } from "@/infra/storage/InMemoryFileStorage";

describe("DeleteFile", () => {
  let storage: InMemoryFileStorage;
  let useCase: DeleteFile;

  beforeEach(() => {
    storage = new InMemoryFileStorage();
    useCase = new DeleteFile({ fileStorage: storage });
  });

  it("deletes an existing file", async () => {
    await storage.upload({
      key: "resources/res_1/old.pdf",
      data: Buffer.from("x"),
      contentType: "application/pdf",
    });
    const r = await useCase.execute("resources/res_1/old.pdf");
    expect(r.ok).toBe(true);
    expect(storage.has("resources/res_1/old.pdf")).toBe(false);
  });

  it("is not an error to delete a key that doesn't exist", async () => {
    const r = await useCase.execute("resources/does/not/exist.pdf");
    expect(r.ok).toBe(true);
  });
});
