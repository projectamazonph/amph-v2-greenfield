import { describe, expect, it } from "vitest";
import { isReadOnlyPreviewRequest } from "../preview-read-only";

const MUTATING_METHODS = ["POST", "PUT", "PATCH", "DELETE"];
const SAFE_METHODS = ["GET", "HEAD", "OPTIONS"];

describe("isReadOnlyPreviewRequest", () => {
  it.each(MUTATING_METHODS)("blocks %s when VERCEL_ENV is preview", (method) => {
    expect(isReadOnlyPreviewRequest(method, "preview")).toBe(true);
  });

  it.each(MUTATING_METHODS)("allows %s when VERCEL_ENV is production", (method) => {
    expect(isReadOnlyPreviewRequest(method, "production")).toBe(false);
  });

  it.each(MUTATING_METHODS)(
    "allows %s when VERCEL_ENV is unset (local dev, CI, next start)",
    (method) => {
      expect(isReadOnlyPreviewRequest(method, undefined)).toBe(false);
    },
  );

  it.each(MUTATING_METHODS)("allows %s under VERCEL_ENV development", (method) => {
    expect(isReadOnlyPreviewRequest(method, "development")).toBe(false);
  });

  it.each(SAFE_METHODS)("allows %s on preview so pages still render", (method) => {
    expect(isReadOnlyPreviewRequest(method, "preview")).toBe(false);
  });

  it("matches the verb case-insensitively", () => {
    expect(isReadOnlyPreviewRequest("post", "preview")).toBe(true);
  });
});
