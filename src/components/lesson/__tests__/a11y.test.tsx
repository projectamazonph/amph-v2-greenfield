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
  AnnotatedListingCanvas,
  EvidenceLedger,
  FunnelCanvas,
  HierarchyBuilder,
  LessonPathway,
  PortfolioMap,
  SeasonalCalendar,
  SimulationBriefBuilder,
  SovPositioner,
  TimelineCalendar,
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

  it("AnnotatedListingCanvas has no axe violations", async () => {
    const { container } = render(
      <AnnotatedListingCanvas
        id="a11y-listing"
        title="Listing anatomy"
        sections={[
          { id: "title", label: "Title", role: "Relevance", content: "Coffee grinder", effect: "Earn the click" },
          { id: "bullet-1", label: "Bullet one", role: "Confidence", content: "Fast burr set", effect: "Reduce doubt" },
        ]}
      />,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("HierarchyBuilder has no axe violations", async () => {
    const { container } = render(
      <HierarchyBuilder
        id="a11y-hierarchy"
        title="Campaign hierarchy"
        root={{
          id: "account",
          label: "Account",
          type: "account",
          children: [{ id: "campaign", label: "Core campaign", type: "campaign", children: [{ id: "group", label: "Exact group", type: "ad-group" }] }],
        }}
      />,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("FunnelCanvas has no axe violations", async () => {
    const { container } = render(
      <FunnelCanvas
        id="a11y-funnel"
        title="Funnel route"
        stages={[
          { id: "awareness", label: "Awareness", role: "Create demand", formats: ["Sponsored Brands video"], question: "Who should know?" },
          { id: "conversion", label: "Conversion", role: "Capture intent", formats: ["Sponsored Products exact"], question: "Who is ready?" },
        ]}
      />,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("TimelineCalendar has no axe violations", async () => {
    const { container } = render(
      <TimelineCalendar
        id="a11y-timeline"
        title="Weekly cadence"
        periods={["Week 1", "Week 2"]}
        rows={[{ id: "monitor", label: "Monitor", values: ["Baseline", "Adjust"], tone: "accent" }]}
      />,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("LessonPathway has no axe violations", async () => {
    const { container } = render(
      <LessonPathway
        id="a11y-pathway"
        title="Learning path"
        steps={[{ id: "learn", label: "Learn", purpose: "Build the model", action: "Read", status: "done" }, { id: "practice", label: "Practice", purpose: "Apply the model", action: "Try", status: "current" }]}
      />,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("SimulationBriefBuilder has no axe violations", async () => {
    const { container } = render(
      <SimulationBriefBuilder
        id="a11y-brief"
        title="Simulation brief"
        fields={[{ id: "goal", label: "Goal", prompt: "State the target", required: true }, { id: "budget", label: "Budget", prompt: "State the limit", example: "₱10,000" }]}
      />,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("PortfolioMap has no axe violations", async () => {
    const { container } = render(
      <PortfolioMap
        id="a11y-portfolio"
        title="Portfolio control"
        groups={[
          { id: "core", label: "Core", share: "60%", purpose: "Protect profit", campaigns: [{ id: "core-sp", label: "Core SP", purpose: "Harvest demand", budget: "₱6,000", bidLogic: "Target ACoS" }] },
          { id: "launch", label: "Launch", share: "20%", purpose: "Create growth", campaigns: [] },
        ]}
      />,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("SeasonalCalendar has no axe violations", async () => {
    const { container } = render(
      <SeasonalCalendar
        id="a11y-seasonal"
        title="Seasonal plan"
        phases={[{ id: "pre", label: "Pre-event", timing: "Before", goal: "Prepare", actions: ["Test bids"], risk: "Late setup" }, { id: "event", label: "Event", timing: "During", goal: "Scale", actions: ["Protect budget"], risk: "Waste" }]}
      />,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("EvidenceLedger has no axe violations", async () => {
    const { container } = render(
      <EvidenceLedger
        id="a11y-evidence"
        title="Evidence chain"
        entries={[{ id: "report", source: "Search term report", signal: "CTR fell", implication: "Relevance weakened", nextCheck: "Review query and listing" }, { id: "sales", source: "Business report", signal: "Sales held", implication: "Conversion remains stable", nextCheck: "Check bid efficiency" }]}
      />,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("SovPositioner has no axe violations", async () => {
    const { container } = render(
      <SovPositioner
        id="a11y-sov"
        title="Share of voice posture"
        bands={[{ id: "contender", label: "Contender", range: "<15%", posture: "Grow", actions: ["Test coverage"] }, { id: "established", label: "Established", range: "15–35%", posture: "Defend", actions: ["Protect winners"] }]}
      />,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
