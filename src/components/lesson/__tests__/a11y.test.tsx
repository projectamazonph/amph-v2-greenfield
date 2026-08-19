// src/components/lesson/__tests__/a11y.test.tsx
// @vitest-environment jsdom
/// <reference types="@testing-library/jest-dom" />

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
