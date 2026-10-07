/**
 * DashboardHeroStats — 5-day activity dots + total XP strip rendered
 * in the dashboard hero header on the right of the welcome line.
 *
 * The component is pure (server-safe); it receives the props from the
 * dashboard page's data loader.
 */

import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import { createElement } from "react";
import { DashboardHeroStats } from "../DashboardHeroStats";

describe("DashboardHeroStats", () => {
  it("renders the total XP formatted as an integer", () => {
    const html = renderToString(
      createElement(DashboardHeroStats, {
        totalXp: 1240,
        activeDaysOutOfFive: 3,
      }),
    );

    expect(html).toContain("1,240");
    expect(html).toContain("XP");
  });

  it("renders exactly 5 day dots", () => {
    const html = renderToString(
      createElement(DashboardHeroStats, {
        totalXp: 0,
        activeDaysOutOfFive: 0,
      }),
    );

    const dotMatches = html.match(/data-day-dot="(\d+)"/g) ?? [];
    expect(dotMatches.length).toBe(5);
  });

  it("marks the active days filled and the inactive days unfilled", () => {
    const html = renderToString(
      createElement(DashboardHeroStats, {
        totalXp: 100,
        activeDaysOutOfFive: 3,
      }),
    );

    const filled = html.match(/data-day-dot="\d+" data-day-state="filled"/g) ?? [];
    const unfilled = html.match(/data-day-dot="\d+" data-day-state="unfilled"/g) ?? [];

    expect(filled.length).toBe(3);
    expect(unfilled.length).toBe(2);
  });

  it("clamps activeDaysOutOfFive to [0, 5]", () => {
    const html = renderToString(
      createElement(DashboardHeroStats, {
        totalXp: 0,
        activeDaysOutOfFive: 99,
      }),
    );

    const filled = html.match(/data-day-state="filled"/g) ?? [];
    expect(filled.length).toBe(5);
  });

  it("announces the streak via an accessible label", () => {
    const html = renderToString(
      createElement(DashboardHeroStats, {
        totalXp: 200,
        activeDaysOutOfFive: 2,
      }),
    );

    expect(html).toContain('aria-label="2 active days out of the last 5"');
  });
});
