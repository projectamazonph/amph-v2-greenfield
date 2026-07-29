/**
 * BidElevatorForm: result-panel wiring.
 *
 * Regression: the form used to stash the simulator output in
 * sessionStorage and call router.refresh(). The Bid Elevator page is a
 * server component and never read sessionStorage back, and it never
 * rendered BidElevatorResult at all, so pressing "Run simulation" did
 * nothing visible. The result now lives in this component's state and
 * renders below the form, matching the other four simulator forms.
 *
 * There is no DOM testing library in this repo, so the click path is
 * covered by asserting the wiring in the source plus the pre-submit
 * render. The simulator itself is covered by
 * tests/unit/domain/simulator/bid-elevator and the action by
 * src/app/tools/bid-elevator/__tests__/actions.test.ts.
 */

import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { renderToString } from "react-dom/server";

vi.mock("server-only", () => ({}));
vi.mock("@/app/tools/bid-elevator/actions", () => ({
  runBidElevator: vi.fn(),
}));

import { BidElevatorForm } from "../BidElevatorForm";
import { BidElevatorResult } from "../BidElevatorResult";

const KEYWORDS = [
  { keyword: "wireless earbuds", currentBid: 25, currentCpc: 0.85, volume: 12450 },
  { keyword: "bluetooth earbuds", currentBid: 30, currentCpc: 1.1, volume: 8200 },
];

function formSource(): string {
  return readFileSync(new URL("../BidElevatorForm.tsx", import.meta.url), "utf8");
}

describe("BidElevatorForm", () => {
  it("renders an input per seed keyword", () => {
    const html = renderToString(
      <BidElevatorForm budget={1000} targetRoas={4} initialKeywords={KEYWORDS} />,
    );
    expect(html).toContain("wireless earbuds");
    expect(html).toContain("bluetooth earbuds");
    expect(html).toContain("Run simulation");
  });

  it("shows no result panel before the first run", () => {
    const html = renderToString(
      <BidElevatorForm budget={1000} targetRoas={4} initialKeywords={KEYWORDS} />,
    );
    expect(html).not.toContain("Projected daily spend");
  });

  it("holds the run output in state and renders BidElevatorResult from it", () => {
    const source = formSource();
    expect(source).toMatch(/useState<BidElevatorOutput \| null>\(null\)/);
    expect(source).toMatch(/setResult\(response\.value\)/);
    expect(source).toMatch(/<BidElevatorResult result=\{result\} targetRoas=\{targetRoas\} \/>/);
  });

  it("no longer routes the result through sessionStorage", () => {
    const source = formSource();
    expect(source).not.toContain("sessionStorage");
    expect(source).not.toContain("router.refresh");
  });

  it("clears a stale result when a run fails", () => {
    const source = formSource();
    expect(source).toMatch(/setError\(response\.error\.message\);\s*setResult\(null\);/);
  });

  it("renders the result panel when given output", () => {
    const html = renderToString(
      <BidElevatorResult
        result={{
          score: 82,
          estimatedSpend: 940.5,
          estimatedRoas: 4.2,
          scoreDimensions: null,
          bids: [
            {
              keyword: "wireless earbuds",
              currentBid: 25,
              groundTruth: 21.5,
              estimatedCpc: 0.85,
              volume: 12450,
            },
          ],
        }}
        targetRoas={4}
      />,
    );
    expect(html).toContain("Projected daily spend");
    expect(html).toContain("82");
    expect(html).toContain("wireless earbuds");
  });
});
