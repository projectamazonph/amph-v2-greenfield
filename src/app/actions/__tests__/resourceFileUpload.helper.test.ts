/**
 * uploadResourceFile — src/app/actions/resourceFileUpload.helper.ts.
 *
 * Covers the size/MIME-type validation added in review: this route used
 * to buffer any uploaded file into memory (`file.arrayBuffer()`) with no
 * upper bound and no type check at all.
 */
import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  uploadResourceFile,
  MAX_RESOURCE_FILE_SIZE_BYTES,
} from "@/app/actions/resourceFileUpload.helper";
import { UploadFile } from "@/usecases/UploadFile";
import { InMemoryFileStorage } from "@/infra/storage/InMemoryFileStorage";
import type { AppContainer } from "@/composition/container";

function makeContainer(): AppContainer {
  const fileStorage = new InMemoryFileStorage();
  return { uploadFile: new UploadFile({ fileStorage }) } as unknown as AppContainer;
}

/** Minimal File-like object — Buffer-backed, no real Blob/FormData plumbing needed. */
function makeFile(name: string, type: string, sizeBytes: number): File {
  const data = new Uint8Array(sizeBytes);
  return new File([data], name, { type });
}

describe("uploadResourceFile", () => {
  it("uploads a normal PDF", async () => {
    const container = makeContainer();
    const file = makeFile("guide.pdf", "application/pdf", 1024);
    const result = await uploadResourceFile(container, "res_1", file);
    expect(result.ok).toBe(true);
  });

  it("rejects a file over the size limit before buffering it", async () => {
    const container = makeContainer();
    const file = makeFile("huge.zip", "application/zip", MAX_RESOURCE_FILE_SIZE_BYTES + 1);
    const result = await uploadResourceFile(container, "res_1", file);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("file_too_large");
  });

  it("accepts a file exactly at the size limit", async () => {
    const container = makeContainer();
    const file = makeFile("edge.zip", "application/zip", MAX_RESOURCE_FILE_SIZE_BYTES);
    const result = await uploadResourceFile(container, "res_1", file);
    expect(result.ok).toBe(true);
  });

  it("rejects an unsupported MIME type", async () => {
    const container = makeContainer();
    const file = makeFile("script.exe", "application/x-msdownload", 1024);
    const result = await uploadResourceFile(container, "res_1", file);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("unsupported_file_type");
  });

  it("allows a file with no detected MIME type through (browser couldn't determine it)", async () => {
    const container = makeContainer();
    const file = makeFile("mystery", "", 1024);
    const result = await uploadResourceFile(container, "res_1", file);
    expect(result.ok).toBe(true);
  });

  it("accepts each allowlisted category (xlsx, docx, zip, image)", async () => {
    const container = makeContainer();
    const cases: Array<[string, string]> = [
      ["sheet.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
      ["doc.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
      ["archive.zip", "application/zip"],
      ["cover.png", "image/png"],
    ];
    for (const [name, type] of cases) {
      const file = makeFile(name, type, 512);
      const result = await uploadResourceFile(container, "res_1", file);
      expect(result.ok).toBe(true);
    }
  });
});
