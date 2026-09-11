/**
 * Maintenance page tests (P1-05).
 *
 * Pins: the support email comes from the site setting when present,
 * and the hardcoded fallback renders when the lookup fails, so the
 * 503 page keeps working during a database outage.
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderToString } from "react-dom/server";
import { Result } from "@/domain/shared/Result";

const { execute } = vi.hoisted(() => ({ execute: vi.fn() }));

vi.mock("@/composition/container", () => ({
  buildContainer: () => ({ getSetting: { execute } }),
}));

import MaintenancePage from "../page";

beforeEach(() => {
  execute.mockReset();
});

describe("MaintenancePage", () => {
  it("uses the stored support email when present", async () => {
    execute.mockResolvedValue(Result.ok("help@projectamazonph.online"));

    const html = renderToString(await MaintenancePage());

    expect(execute).toHaveBeenCalledWith({
      key: "support_email",
      narrow: expect.any(Function),
      defaultValue: "support@projectamazonph.online",
    });
    expect(html).toContain("help@projectamazonph.online");
    expect(html).toContain("mailto:help@projectamazonph.online");
  });

  it("falls back to the hardcoded email when the lookup fails", async () => {
    execute.mockRejectedValue(new Error("database down"));

    const html = renderToString(await MaintenancePage());

    expect(html).toContain("support@projectamazonph.online");
    expect(html).toContain("mailto:support@projectamazonph.online");
  });
});
