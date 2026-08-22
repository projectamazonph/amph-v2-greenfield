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
import {
  ComparisonTable,
  CompetitiveGapMatrix,
  DecisionFlow,
  FormulaLadder,
  InsightRouter,
  SimulationRubric,
} from "../index";

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

  it("new tranche table and formula primitives have no axe violations", async () => {
    const { container } = render(
      <>
        <ComparisonTable
          id="a11y-comparison"
          title="Compare"
          columns={["Discovery", "Protection"]}
          rows={[{ label: "Intent", values: ["Broad", "Narrow"] }]}
        />
        <FormulaLadder
          id="a11y-formula"
          title="Calculate"
          steps={[{ label: "Spend", expression: "clicks × CPC" }]}
          result={{ label: "ACoS", value: "30%" }}
        />
      </>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("new tranche decision and rubric primitives have no axe violations", async () => {
    const { container } = render(
      <>
        <DecisionFlow
          id="a11y-decision"
          title="Decide"
          steps={[{ id: "step-1", label: "Inspect", question: "What changed?", evidence: "Read the report", action: "Make one bounded change" }]}
          revealMode="after-choice"
        />
        <SimulationRubric
          id="a11y-rubric"
          title="Review"
          scenario="Prepare the campaign."
          criteria={[{ id: "structure", label: "Structure", lookFor: "Clear naming" }]}
        />
      </>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("new tranche competitive insight primitives have no axe violations", async () => {
    const { container } = render(
      <>
        <CompetitiveGapMatrix
          id="a11y-gaps"
          title="Gaps"
          dimensions={["Visibility"]}
          competitors={[{ id: "competitor-a", label: "Competitor A", values: ["Weak"], signal: "Low visibility", action: "Check share of voice" }]}
          revealMode="after-choice"
        />
        <InsightRouter
          id="a11y-insight"
          title="Route"
          routes={[{ id: "route-1", signal: "Low CTR", implication: "Relevance is weak", evidence: "Review query and listing", action: "Test the title" }]}
          revealMode="after-choice"
        />
      </>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
