/**
 * StrTriageSimulator tests — TDD (red first).
 *
 * STORY-038: STR Triage simulator.
 */

import { describe, it, expect } from "vitest";
import { StrTriageSimulator } from "@/domain/simulator/str-triage/StrTriageSimulator";
import type { StrTriageInput } from "@/domain/simulator/str-triage/StrTriageInput";

describe("StrTriageSimulator", () => {
  const simulator = new StrTriageSimulator();

  it("classifies a high-ROAS keyword within budget as keep", async () => {
    const input: StrTriageInput = {
      rows: [{ keyword: "running shoes men", spend: 20, revenue: 100, orders: 5 }],
      targetRoas: 3.0,
    };

    const result = await simulator.run(input);

    expect(result.classifications).toHaveLength(1);
    expect(result.classifications[0]).toMatchObject({
      keyword: "running shoes men",
      action: "keep",
    });
    expect(result.score).toBeGreaterThan(0);
  });

  it("classifies a low-ROAS keyword over budget as pause", async () => {
    const input: StrTriageInput = {
      rows: [{ keyword: "cheap shoes", spend: 60, revenue: 80, orders: 2 }],
      targetRoas: 3.0,
    };

    const result = await simulator.run(input);

    expect(result.classifications).toHaveLength(1);
    expect(result.classifications[0]).toMatchObject({
      keyword: "cheap shoes",
      action: "pause",
    });
  });

  it("classifies a high-ROAS low-spend keyword as add_as_exact", async () => {
    const input: StrTriageInput = {
      rows: [{ keyword: "premium running gear", spend: 2, revenue: 20, orders: 1 }],
      targetRoas: 3.0,
    };

    const result = await simulator.run(input);

    expect(result.classifications).toHaveLength(1);
    expect(result.classifications[0]).toMatchObject({
      keyword: "premium running gear",
      action: "add_as_exact",
    });
  });

  it("classifies a marginal high-volume keyword as add_as_phrase", async () => {
    const input: StrTriageInput = {
      rows: [{ keyword: "athletic footwear", spend: 30, revenue: 80, orders: 3 }],
      targetRoas: 3.0,
    };

    const result = await simulator.run(input);

    expect(result.classifications).toHaveLength(1);
    expect(result.classifications[0]).toMatchObject({
      keyword: "athletic footwear",
      action: "add_as_phrase",
    });
  });

  it("returns empty result for empty rows", async () => {
    const input: StrTriageInput = {
      rows: [],
      targetRoas: 3.0,
    };

    const result = await simulator.run(input);

    expect(result.classifications).toHaveLength(0);
    expect(result.score).toBe(100); // nothing to triage = perfect
  });

  it("classifies a mix of keywords correctly", async () => {
    const input: StrTriageInput = {
      rows: [
        { keyword: "good keyword", spend: 10, revenue: 50, orders: 2 }, // ROAS 5, within budget → keep
        { keyword: "bad keyword", spend: 50, revenue: 30, orders: 1 }, // ROAS 0.6, over budget → pause
        { keyword: "new keyword", spend: 1, revenue: 8, orders: 1 }, // ROAS 8, low spend → add_as_exact
        { keyword: "maybe keyword", spend: 40, revenue: 110, orders: 4 }, // ROAS 2.75, high spend → add_as_phrase
      ],
      targetRoas: 3.0,
    };

    const result = await simulator.run(input);

    expect(result.classifications).toHaveLength(4);
    const actions = new Map(result.classifications.map((c) => [c.keyword, c.action]));
    expect(actions.get("good keyword")).toBe("keep");
    expect(actions.get("bad keyword")).toBe("pause");
    expect(actions.get("new keyword")).toBe("add_as_exact");
    expect(actions.get("maybe keyword")).toBe("add_as_phrase");
  });
});
