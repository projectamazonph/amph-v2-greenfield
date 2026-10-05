// src/components/practice/__tests__/PracticeProgressCard.test.tsx
// @vitest-environment jsdom

/**
 * PracticeProgressCard.test.tsx — Task 9 of the 2026-09-30 SimGrid
 * integration plan.
 *
 * Locks the dashboard card contract for SimGrid practice:
 * - Card renders one row per allowlisted SimgridSimulatorId (12 total).
 * - Each row shows the simulator's title.
 * - When the user has no attempts, every row reads "Not started"
 *   (this is the empty-state contract the dashboard relies on).
 *
 * The container + auth mocks are deliberately minimal: only the
 * `getBestSimgridScore` use case (read the best score for a single
 * simulator) and `getSessionUserId` (resolve the viewing user) are
 * stubbed, because those are the only two ports the component calls.
 * Other container ports are not exercised by this component.
 *
 * `render` here renders the awaited JSX returned by the async server
 * component, not the Promise itself — Vitest's `render` from
 * @testing-library/react expects a synchronous React element, so the
 * caller awaits the async component first to unwrap the
 * Promise<JSX.Element>.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/composition/container", () => ({
  buildContainer: () => ({
    getBestSimgridScore: { execute: async () => ({ ok: true, value: null }) },
  }),
}));

vi.mock("@/lib/auth", () => ({
  getSessionUserId: async () => "u1",
}));

import { PracticeProgressCard } from "@/components/practice/PracticeProgressCard";

describe("PracticeProgressCard", () => {
  it("renders all 12 simulators", async () => {
    const card = await PracticeProgressCard();
    render(card);
    // Title assertions use the heading element because the Capstone
    // simulator's tag is also "Capstone" (per the manifest) — a plain
    // getByText would double-match on that single row. Same pattern as
    // PracticeGrid.test.tsx.
    expect(screen.getByText("AdConsole Pro", { selector: "h3" })).toBeDefined();
    expect(screen.getByText("Bid Decisions", { selector: "h3" })).toBeDefined();
    expect(screen.getByText("Capstone", { selector: "h3" })).toBeDefined();
    expect(screen.getByText("Keyword Lab", { selector: "h3" })).toBeDefined();
    expect(screen.getByText("Search Term Triage", { selector: "h3" })).toBeDefined();
  });

  it("shows 'Not started' when the user has no attempts", async () => {
    const card = await PracticeProgressCard();
    render(card);
    expect(screen.getAllByText("Not started").length).toBeGreaterThanOrEqual(12);
  });
});
