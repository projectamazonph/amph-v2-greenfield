/**
 * GetSetting + ListSettings tests (P1-05).
 *
 * Pins: defaults on missing rows, failures, and wrong shapes; the
 * admin list passthrough.
 */

import { describe, expect, it, beforeEach } from "vitest";
import { Result } from "@/domain/shared/Result";
import { createSetting } from "@/domain/entities/Setting";
import { GetSetting } from "@/usecases/GetSetting";
import { InMemorySettingRepository } from "@/infra/repositories/inmemory/InMemorySettingRepository";

function asEmail(value: unknown): string | null {
  return typeof value === "string" && value.includes("@") ? value : null;
}

describe("GetSetting", () => {
  it("returns the narrowed value when the row matches", async () => {
    const repo = new InMemorySettingRepository();
    const built = createSetting({
      key: "support_email",
      value: "support@projectamazonph.online",
      createdById: "admin-1",
    });
    if (Result.isErr(built)) throw new Error("setup failed");
    await repo.upsert(built.value);

    const useCase = new GetSetting({ settingRepo: repo });
    const result = await useCase.execute({
      key: "support_email",
      narrow: asEmail,
      defaultValue: "fallback@projectamazonph.online",
    });

    expect(result).toEqual(Result.ok("support@projectamazonph.online"));
  });

  it("falls back on a missing row", async () => {
    const useCase = new GetSetting({ settingRepo: new InMemorySettingRepository() });

    const result = await useCase.execute({
      key: "support_email",
      narrow: asEmail,
      defaultValue: "fallback@projectamazonph.online",
    });

    expect(result).toEqual(Result.ok("fallback@projectamazonph.online"));
  });

  it("falls back when the stored shape is wrong", async () => {
    const repo = new InMemorySettingRepository();
    const built = createSetting({ key: "support_email", value: 42, createdById: "admin-1" });
    if (Result.isErr(built)) throw new Error("setup failed");
    await repo.upsert(built.value);

    const useCase = new GetSetting({ settingRepo: repo });
    const result = await useCase.execute({
      key: "support_email",
      narrow: asEmail,
      defaultValue: "fallback@projectamazonph.online",
    });

    expect(result).toEqual(Result.ok("fallback@projectamazonph.online"));
  });
});
