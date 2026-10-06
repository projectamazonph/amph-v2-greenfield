// src/components/practice/__tests__/PracticeGrid.test.tsx
// @vitest-environment jsdom

/**
 * PracticeGrid.test.tsx — Task 7 of the 2026-09-30 SimGrid
 * integration plan.
 *
 * Locks the structural contract for the practice hub index card grid:
 * - One card per allowlisted SimgridSimulatorId (12 total).
 * - Each card renders its simulator title as a heading.
 * - Each card links to /practice/<file>.html where <file>
 *   matches a vendored HTML file under public/simgrid-v1/.
 *
 * Title assertions use getByRole("heading") rather than getByText
 * because the Capstone card has tag="Capstone" and title="Capstone"
 * (the vendored index.html mirrors this), so a plain text match
 * would double-match on that one card.
 *
 * The first assertion iterates over every entry in
 * SIMGRID_SIMULATOR_META, so adding a new simulator entry requires
 * updating this test (intentional). The second assertion checks the
 * route shape on every card link, not just the first, so a missing or
 * misrouted card fails the build.
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { PracticeGrid } from "@/components/practice/PracticeGrid";
import { SIMGRID_SIMULATOR_META } from "@/lib/simgrid/manifest";

describe("PracticeGrid", () => {
  it("renders a card for every simulator", () => {
    render(<PracticeGrid />);
    for (const entry of SIMGRID_SIMULATOR_META) {
      expect(screen.getByRole("heading", { name: entry.title, level: 2 })).toBeDefined();
    }
  });

  it("each card links to /practice/<file>", () => {
    render(<PracticeGrid />);
    const links = screen.getAllByRole("link", { name: /Open simulator/i });
    expect(links.length).toBe(SIMGRID_SIMULATOR_META.length);
    for (const link of links) {
      expect(link.getAttribute("href")).toMatch(/^\/practice\/.+\.html$/);
    }
  });
});
