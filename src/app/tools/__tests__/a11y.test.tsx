// @vitest-environment jsdom
/// <reference types="@testing-library/jest-dom" />

import "vitest-axe/extend-expect";

import { render } from "@testing-library/react";
import { axe } from "vitest-axe";
import { describe, expect, it, vi } from "vitest";

const simulatorList = [
  { simulatorId: "bid-elevator" },
  { simulatorId: "str-triage" },
  { simulatorId: "campaign-builder" },
  { simulatorId: "listing-audit" },
  { simulatorId: "keyword-research" },
];

vi.mock("@/composition/container", () => ({
  buildContainer: () => ({
    simulatorRegistry: { list: () => simulatorList },
  }),
}));

import ToolsIndexPage from "../page";

describe("student tools index accessibility", () => {
  it("has no axe violations across practice simulators and live console", async () => {
    const { container } = render(await ToolsIndexPage());

    expect(await axe(container)).toHaveNoViolations();
  });
});
