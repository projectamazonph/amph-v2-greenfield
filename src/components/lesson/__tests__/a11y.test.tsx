// src/components/lesson/__tests__/a11y.test.tsx
// @vitest-environment jsdom
/// <reference types="@testing-library/jest-dom" />

// Local matcher registration. We deliberately do NOT register
// "vitest-axe/extend-expect" or "@testing-library/jest-dom/vitest" in
// vitest.setup.ts: those imports flip Vitest 4.x into strict partial-mock
// mode, which breaks src/lib/__tests__/auth.guards.test.ts because the
// global `vi.mock("@/lib/auth", …)` does not export requireAdmin.
// Loading the matchers per-file keeps the strict-mock regression out of
// the suite-wide setup.
import "vitest-axe/extend-expect";

import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { axe } from "vitest-axe";
import { TradeOffTable } from "../TradeOffTable";
import { PitfallCallout } from "../PitfallCallout";
import { ProcessDiagram } from "../ProcessDiagram";
import { SelfCheck } from "../SelfCheck";

describe("lesson primitives a11y", () => {
  it("TradeOffTable has no axe violations", async () => {
    const { container } = render(
      <TradeOffTable
        id="a11y-tot"
        title="The Big Six"
        pairs={[
          { label: "CPC", value: "Cost per click" },
          { label: "CTR", value: "Click-through rate" },
        ]}
      />,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("PitfallCallout has no axe violations", async () => {
    const { container } = render(
      <PitfallCallout id="a11y-pc" variant="warning" title="Watch out">
        <p>Body copy.</p>
      </PitfallCallout>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("ProcessDiagram has no axe violations", async () => {
    const { container } = render(
      <ProcessDiagram
        id="a11y-pd"
        title="Loop"
        steps={[
          { id: "s1", label: "Read" },
          { id: "s2", label: "Decide" },
        ]}
      />,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("SelfCheck has no axe violations", async () => {
    const { container } = render(
      <SelfCheck
        id="a11y-sc"
        prompt="Pick CPC."
        options={["CPC", "CTR"]}
        answerIndex={0}
        explanation="It's cost per click."
      />,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
