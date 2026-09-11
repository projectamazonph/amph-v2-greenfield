/**
 * Setting entity tests (P1-05).
 *
 * Pins: key format branches, the JSON-serializable gate (including
 * a circular structure), description length, and the update stamp.
 */

import { describe, expect, it } from "vitest";
import { Result } from "@/domain/shared/Result";
import {
  createSetting,
  isJsonSerializable,
  isSettingKey,
  updateSetting,
} from "@/domain/entities/Setting";

describe("isSettingKey", () => {
  it("accepts lowercase dot names", () => {
    expect(isSettingKey("support_email")).toBe(true);
    expect(isSettingKey("checkout.notice.v2")).toBe(true);
  });

  it.each([[""], ["Support_Email"], ["-lead"], ["has space"], ["a".repeat(65)]])(
    "rejects %s",
    (key) => {
      expect(isSettingKey(key)).toBe(false);
    },
  );
});

describe("isJsonSerializable", () => {
  it("accepts plain data", () => {
    expect(isJsonSerializable("support@x.online")).toBe(true);
    expect(isJsonSerializable({ to: ["a@x"], limit: 3 })).toBe(true);
    expect(isJsonSerializable(null)).toBe(true);
  });

  it("rejects values JSON cannot hold", () => {
    expect(isJsonSerializable(undefined)).toBe(false);
    expect(isJsonSerializable(() => {})).toBe(false);
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(isJsonSerializable(circular)).toBe(false);
  });
});

describe("createSetting", () => {
  it("creates a row with actor stamps", () => {
    const result = createSetting({
      key: "support_email",
      value: "support@projectamazonph.online",
      description: "Shown on the 503 page.",
      createdById: "admin-1",
    });

    expect(Result.isOk(result)).toBe(true);
    if (Result.isOk(result)) {
      expect(result.value.key).toBe("support_email");
      expect(result.value.deletedAt).toBeNull();
      expect(result.value.updatedById).toBe("admin-1");
    }
  });

  it.each([
    ["invalid_key", { key: "Bad Key" }],
    ["invalid_value", { value: undefined }],
    ["invalid_description", { description: "x".repeat(281) }],
  ])("rejects %s", (kind, overrides) => {
    const result = createSetting({
      key: "support_email",
      value: "support@projectamazonph.online",
      createdById: "admin-1",
      ...overrides,
    });

    expect(result).toEqual(Result.err({ kind }));
  });
});

describe("updateSetting", () => {
  it("replaces the value and stamps the actor", () => {
    const created = createSetting({
      key: "support_email",
      value: "old@projectamazonph.online",
      createdById: "admin-1",
    });
    if (Result.isErr(created)) throw new Error("setup failed");

    const updated = updateSetting(created.value, {
      value: "new@projectamazonph.online",
      updatedById: "admin-2",
      updatedAt: new Date("2026-09-11T01:00:00Z"),
    });

    expect(Result.isOk(updated)).toBe(true);
    if (Result.isOk(updated)) {
      expect(updated.value.value).toBe("new@projectamazonph.online");
      expect(updated.value.updatedById).toBe("admin-2");
      expect(updated.value.description).toBeNull();
    }
  });

  it("keeps the old description unless a new one is given", () => {
    const created = createSetting({
      key: "support_email",
      value: "a@x",
      description: "Original.",
      createdById: "admin-1",
    });
    if (Result.isErr(created)) throw new Error("setup failed");

    const kept = updateSetting(created.value, {
      value: "b@x",
      updatedById: "admin-2",
      updatedAt: new Date(),
    });

    if (Result.isErr(kept)) throw new Error("setup failed");
    expect(kept.value.description).toBe("Original.");
  });

  it("rejects a non-serializable value", () => {
    const created = createSetting({ key: "k", value: "v", createdById: "admin-1" });
    if (Result.isErr(created)) throw new Error("setup failed");

    expect(
      updateSetting(created.value, {
        value: () => {},
        updatedById: "admin-2",
        updatedAt: new Date(),
      }),
    ).toEqual(Result.err({ kind: "invalid_value" }));
  });
});
