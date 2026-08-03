import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { LocalFileStorage } from "../LocalFileStorage";

describe("LocalFileStorage", () => {
  let baseDir: string;
  let storage: LocalFileStorage;

  beforeEach(async () => {
    baseDir = await fs.mkdtemp(path.join(os.tmpdir(), "local-file-storage-test-"));
    storage = new LocalFileStorage(baseDir);
  });

  afterEach(async () => {
    await fs.rm(baseDir, { recursive: true, force: true });
  });

  it("writes the file under public/uploads and returns a root-relative url", async () => {
    const r = await storage.upload({
      key: "resources/a.pdf",
      data: Buffer.from("hello"),
      contentType: "application/pdf",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.url).toBe("/uploads/resources/a.pdf");
    expect(r.value.key).toBe("resources/a.pdf");

    const written = await fs.readFile(path.join(baseDir, "public", "uploads", "resources/a.pdf"));
    expect(written.toString()).toBe("hello");
  });

  it("creates nested directories as needed", async () => {
    const r = await storage.upload({
      key: "resources/res_1/nested/file.xlsx",
      data: Buffer.from("x"),
      contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    expect(r.ok).toBe(true);
  });

  it("deletes an uploaded file", async () => {
    await storage.upload({ key: "k.pdf", data: Buffer.from("x"), contentType: "application/pdf" });
    const r = await storage.delete("k.pdf");
    expect(r.ok).toBe(true);
    await expect(fs.access(path.join(baseDir, "public", "uploads", "k.pdf"))).rejects.toThrow();
  });

  it("delete is a no-op success for a missing key", async () => {
    const r = await storage.delete("does-not-exist.pdf");
    expect(r.ok).toBe(true);
  });
});
