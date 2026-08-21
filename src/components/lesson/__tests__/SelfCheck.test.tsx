// src/components/lesson/__tests__/SelfCheck.test.tsx
// @vitest-environment jsdom
/// <reference types="@testing-library/jest-dom" />

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SelfCheck } from "../SelfCheck";

describe("SelfCheck", () => {
  it("renders prompt and options", () => {
    render(
      <SelfCheck
        id="sc-1"
        prompt="Which metric answers 'how much per click'?"
        options={["CPC", "CTR", "ACoS"]}
        answerIndex={0}
        explanation="CPC is cost per click."
      />,
    );
    expect(screen.getByText(/how much per click/i)).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "CPC" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "CTR" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "ACoS" })).toBeInTheDocument();
  });

  it("marks correct answer on submit", async () => {
    const user = userEvent.setup();
    render(
      <SelfCheck
        id="sc-2"
        prompt="Pick CPC."
        options={["CPC", "CTR"]}
        answerIndex={0}
        explanation="It's the cost per click."
      />,
    );
    await user.click(screen.getByRole("radio", { name: "CPC" }));
    await user.click(screen.getByRole("button", { name: /check answer/i }));
    expect(screen.getByText(/correct/i)).toBeInTheDocument();
    expect(screen.getByText(/cost per click/i)).toBeInTheDocument();
  });

  it("marks incorrect answer on submit", async () => {
    const user = userEvent.setup();
    render(
      <SelfCheck
        id="sc-3"
        prompt="Pick CPC."
        options={["CPC", "CTR"]}
        answerIndex={0}
        explanation="It's the cost per click."
      />,
    );
    await user.click(screen.getByRole("radio", { name: "CTR" }));
    await user.click(screen.getByRole("button", { name: /check answer/i }));
    expect(screen.getByText(/not quite/i)).toBeInTheDocument();
  });

  it("does not persist selection across remounts", async () => {
    const user = userEvent.setup();
    const { unmount } = render(
      <SelfCheck
        id="sc-4"
        prompt="Pick CPC."
        options={["CPC", "CTR"]}
        answerIndex={0}
        explanation="It's the cost per click."
      />,
    );
    await user.click(screen.getByRole("radio", { name: "CPC" }));
    unmount();
    render(
      <SelfCheck
        id="sc-4"
        prompt="Pick CPC."
        options={["CPC", "CTR"]}
        answerIndex={0}
        explanation="It's the cost per click."
      />,
    );
    expect(screen.getByRole("radio", { name: "CPC" })).not.toBeChecked();
  });

  it("honors custom revealLabel and retryLabel", () => {
    render(
      <SelfCheck
        id="sc-5"
        prompt="Test labels."
        options={["A", "B"]}
        answerIndex={0}
        explanation="Reason."
        revealLabel="Submit"
        retryLabel="Reset"
      />,
    );
    expect(screen.getByRole("button", { name: "Submit" })).toBeInTheDocument();
  });
});
