import { describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";
import { ToolDebrief } from "../ToolDebrief";

vi.mock("server-only", () => ({}));

function props() {
  return {
    simulatorId: "bid-elevator",
    scoreLabel: "Strong. Every bid change stays inside the target ACoS.",
    whyItMatters: "A client keeps the VA who can explain the reason.",
    lessonHref: "/courses/ppc-foundations",
    lessonLabel: "Revisit the Module 6 bidding lessons (PPC Foundations)",
    retryHref: "/tools/bid-elevator",
    rationalePrompt: "Write one sentence per keyword.",
  };
}

function saveProps() {
  return {
    ...props(),
    saveAction: { save: vi.fn() },
    artefactKind: "decision-log",
    scenarioRef: "bid-elevator:beginner-1",
    courseId: null,
  };
}

describe("ToolDebrief", () => {
  it("renders all five sections", () => {
    const html = renderToString(<ToolDebrief {...props()} />);
    expect(html).toContain("Your result");
    expect(html).toContain("Strong. Every bid change stays inside the target ACoS.");
    expect(html).toContain("Why it matters");
    expect(html).toContain("A client keeps the VA who can explain the reason.");
    expect(html).toContain("Revisit the lesson");
    expect(html).toContain("Try again");
    expect(html).toContain("State your rationale");
    expect(html).toContain("Write one sentence per keyword.");
  });

  it("links the lesson revisit and retry to the right hrefs", () => {
    const html = renderToString(<ToolDebrief {...props()} />);
    expect(html).toContain('href="/courses/ppc-foundations"');
    expect(html).toContain('href="/tools/bid-elevator"');
  });

  it("labels the rationale textarea with a real label, not a placeholder", () => {
    const html = renderToString(<ToolDebrief {...props()} />);
    expect(html).toContain("<label");
    expect(html).toContain("State your rationale");
    expect(html).toContain("<textarea");
  });

  it("never uses certification or hiring-readiness wording", () => {
    const html = renderToString(<ToolDebrief {...props()} />).toLowerCase();
    expect(html).not.toContain("certif");
    expect(html).not.toContain("hiring");
    expect(html).not.toContain("job-ready");
    expect(html).not.toContain("job ready");
  });

  it("shows no save button without save bindings (LEARN-032 behaviour)", () => {
    const html = renderToString(<ToolDebrief {...props()} />);
    expect(html).not.toContain("Save to portfolio");
  });

  it("renders the save button disabled on first paint (rationale starts blank)", () => {
    const html = renderToString(<ToolDebrief {...saveProps()} />);
    expect(html).toContain("Save to portfolio");
    expect(html).toContain("disabled");
  });

  it("shows neither success nor error copy on first paint", () => {
    const html = renderToString(<ToolDebrief {...saveProps()} />);
    expect(html).not.toContain("Saved as a draft");
    expect(html).not.toContain("Could not save right now");
  });
});
