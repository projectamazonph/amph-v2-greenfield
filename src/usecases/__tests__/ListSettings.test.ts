/**
 * ListSettings tests (P1-05).
 *
 * Pins the admin list passthrough.
 */

import { describe, expect, it } from "vitest";
import { Result } from "@/domain/shared/Result";
import { createSetting } from "@/domain/entities/Setting";
import { ListSettings } from "@/usecases/ListSettings";
import { InMemorySettingRepository } from "@/infra/repositories/inmemory/InMemorySettingRepository";

describe("ListSettings", () => {
  it("passes the ordered rows through", async () => {
    const repo = new InMemorySettingRepository();
    const built = createSetting({
      key: "support_email",
      value: "a@x",
      createdById: "admin-1",
    });
    if (Result.isErr(built)) throw new Error("setup failed");
    await repo.upsert(built.value);

    const result = await new ListSettings({ settingRepo: repo }).execute();

    expect(Result.isOk(result)).toBe(true);
    if (Result.isErr(result)) return;
    expect(result.value.rows.map((row) => row.key)).toEqual(["support_email"]);
  });
});
