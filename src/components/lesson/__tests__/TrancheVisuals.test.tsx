// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  ClassificationBoard,
  CompetitiveGapMatrix,
  DecisionFlow,
  InsightRouter,
  SimulationRubric,
  TimelineCalendar,
} from "../index";

const decisionSteps = [
  { id: "signal", label: "Signal", question: "What changed?", evidence: "Inspect the report", action: "Make one safe move" },
];

describe("Tranche visual interactions", () => {
  it("keeps DecisionFlow coach evidence hidden until the learner reveals it", async () => {
    const user = userEvent.setup();
    render(<DecisionFlow id="flow" title="Diagnose" steps={decisionSteps} revealMode="after-choice" />);

    expect(screen.getByRole("button", { name: "Reveal coach rationale" })).toBeInTheDocument();
    expect(screen.getByText(/State the evidence you would inspect/)).toBeInTheDocument();
    expect(screen.queryByText(/Evidence to inspect:/)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Reveal coach rationale" }));
    expect(screen.getByText("Evidence to inspect:")).toBeInTheDocument();
    expect(screen.getByText("Inspect the report")).toBeInTheDocument();
    expect(screen.getByText("Decision boundary:")).toBeInTheDocument();
    expect(screen.getByText("Make one safe move")).toBeInTheDocument();
  });

  it("reveals classification rationales only after an explicit learner action", async () => {
    const user = userEvent.setup();
    render(
      <ClassificationBoard
        id="classify"
        title="Route the term"
        prompt="Choose the narrowest safe action."
        revealMode="after-choice"
        categories={[{ id: "keep", label: "Keep" }, { id: "block", label: "Block" }]}
        items={[{ id: "term", label: "coffee grinder", categoryId: "keep", rationale: "Relevant intent" }]}
      />,
    );

    expect(screen.queryByText("Relevant intent")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Show rationales" }));
    expect(screen.getByText("Relevant intent")).toBeInTheDocument();
  });

  it("keeps competitive gap rationale hidden until the coach reveal", async () => {
    const user = userEvent.setup();
    render(
      <CompetitiveGapMatrix
        id="gaps"
        title="Gap"
        revealMode="after-choice"
        dimensions={["Visibility"]}
        competitors={[{ id: "a", label: "Competitor A", values: ["Weak"], signal: "Low visibility", action: "Check share of voice" }]}
      />,
    );

    expect(screen.getByText(/State whether this competitor/)).toBeInTheDocument();
    expect(screen.queryByText("Low visibility")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Reveal coach rationale" }));
    expect(screen.getByText("Low visibility")).toBeInTheDocument();
  });

  it("updates SimulationRubric progress when criteria are checked", async () => {
    const user = userEvent.setup();
    render(
      <SimulationRubric
        id="rubric"
        title="Pre-flight"
        scenario="Build the campaign."
        criteria={[{ id: "structure", label: "Structure", lookFor: "Clear naming" }, { id: "bids", label: "Bids", lookFor: "Evidence-based" }]}
      />,
    );

    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0");
    await user.click(screen.getByRole("checkbox", { name: /Structure/ }));
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "50");
    expect(screen.getByText("1 of 2 criteria reviewed")).toBeInTheDocument();
  });

  it("updates the timeline readout when a learner changes periods", async () => {
    const user = userEvent.setup();
    render(
      <TimelineCalendar
        id="timeline"
        title="Cadence"
        periods={["Week 1", "Week 2"]}
        rows={[{ id: "monitor", label: "Monitor", values: ["Baseline", "Adjust"] }]}
      />,
    );

    expect(within(screen.getByRole("status")).getByText("Week 1", { selector: "strong" })).toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: "Week 2" }));
    expect(within(screen.getByRole("status")).getByText("Week 2", { selector: "strong" })).toBeInTheDocument();
    expect(within(screen.getByRole("status")).getByText("Monitor: Adjust")).toBeInTheDocument();
  });

  it("routes insight selection through the coach rationale reveal", async () => {
    const user = userEvent.setup();
    render(
      <InsightRouter
        id="insights"
        title="Insight"
        revealMode="after-choice"
        routes={[{ id: "r1", signal: "Signal one", implication: "Implication one", evidence: "Evidence one", action: "Action one" }]}
      />,
    );

    expect(screen.getByText(/Choose the next evidence check/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Reveal coach rationale" }));
    expect(screen.getByText("Implication one")).toBeInTheDocument();
    expect(screen.getByText("Action one")).toBeInTheDocument();
  });
});
