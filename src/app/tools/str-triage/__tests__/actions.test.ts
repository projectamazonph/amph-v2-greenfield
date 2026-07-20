/**
 * classifyStr — server action contract tests.
 */

import { describe, it, expect, vi } from "vitest";
vi.mock("server-only", () => ({}));

import { classifyStr } from "../actions";

describe("classifyStr", () => {
  it("returns invalid_input when rows is empty", async () => {
    const result = await classifyStr({ rows: [], targetRoas: 3 });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("invalid_input");
  });

  it("returns invalid_input when targetRoas is 0", async () => {
    const result = await classifyStr({
      rows: [{ keyword: "a", spend: 1, revenue: 3, orders: 1, action: "keep" }],
      targetRoas: 0,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("invalid_input");
  });

  it("returns invalid_input for unknown action", async () => {
    const result = await classifyStr({
      rows: [{ keyword: "a", spend: 1, revenue: 3, orders: 1, action: "shrug" as never }],
      targetRoas: 3,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("invalid_input");
  });

  it("returns a 0-100 score for valid input", async () => {
    const result = await classifyStr({
      rows: [{ keyword: "a", spend: 1, revenue: 3, orders: 1, action: "keep" }],
      targetRoas: 3,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.score).toBeGreaterThanOrEqual(0);
    expect(result.value.score).toBeLessThanOrEqual(100);
  });
});
