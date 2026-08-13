import { describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";
import { SimulatorModeToggle } from "../SimulatorModeToggle";

describe("SimulatorModeToggle", () => {
  it("explains how a student unlocks Challenge mode", () => {
    const html = renderToString(
      <SimulatorModeToggle
        mode="practice"
        onChange={vi.fn()}
        unlocked={false}
      />,
    );

    expect(html).toContain("Challenge mode is locked");
    expect(html).toContain("Pass this simulator in Practice mode once to unlock it");
    expect(html).toContain("aria-describedby");
  });

  it("does not show a lock explanation after Challenge mode is unlocked", () => {
    const html = renderToString(
      <SimulatorModeToggle
        mode="practice"
        onChange={vi.fn()}
        unlocked
      />,
    );

    expect(html).not.toContain("Challenge mode is locked");
  });
});
