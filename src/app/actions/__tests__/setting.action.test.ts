/**
 * setting.action tests (P1-05).
 *
 * Pins: the admin actor is injected, invalid JSON maps to plain
 * copy without touching the use case, and success redirects to
 * the settings page.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { Result } from "@/domain/shared/Result";

vi.mock("server-only", () => ({}));

const { requireAdmin, execute, redirect } = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  execute: vi.fn(),
  redirect: vi.fn((location: string): never => {
    throw new Error(`REDIRECT:${location}`);
  }),
}));

vi.mock("@/lib/auth", () => ({ requireAdmin }));
vi.mock("@/composition/container", () => ({
  buildContainer: () => ({ setSetting: { execute } }),
}));
vi.mock("next/navigation", () => ({ redirect }));

import { setSettingAction } from "@/app/actions/setting.action";

function form(entries: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    data.append(key, value);
  }
  return data;
}

beforeEach(() => {
  requireAdmin.mockReset();
  execute.mockReset();
  redirect.mockClear();
  requireAdmin.mockResolvedValue({ id: "admin-1", role: "ADMIN" });
});

describe("setSettingAction", () => {
  it("parses JSON, injects the actor, and redirects on success", async () => {
    execute.mockResolvedValue(Result.ok({ key: "support_email" }));

    await expect(
      setSettingAction(
        null,
        form({
          key: "support_email",
          value: '"support@projectamazonph.online"',
          description: "Shown on the 503 page.",
        }),
      ),
    ).rejects.toThrow("REDIRECT:/admin/settings?saved=1");

    expect(execute).toHaveBeenCalledWith({
      actorId: "admin-1",
      key: "support_email",
      value: "support@projectamazonph.online",
      description: "Shown on the 503 page.",
    });
  });

  it("rejects invalid JSON without touching the use case", async () => {
    const result = await setSettingAction(
      null,
      form({ key: "support_email", value: "not json{", description: "" }),
    );

    expect(result).toEqual({
      kind: "error",
      error: "invalid_value",
      message: "Value must be valid JSON.",
    });
    expect(execute).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });

  it("maps a bad key to plain copy", async () => {
    execute.mockResolvedValue(Result.err({ kind: "invalid_key" }));

    const result = await setSettingAction(
      null,
      form({ key: "Bad Key", value: '"x"', description: "" }),
    );

    expect(result).toEqual({
      kind: "error",
      error: "invalid_key",
      message: "Keys use lowercase letters, digits, dots, and underscores.",
    });
  });
});
