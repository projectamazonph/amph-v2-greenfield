/**
 * TopBar.test.tsx — STORY-046.
 */

import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import { createElement } from "react";
import { TopBar } from "../TopBar";

function render(props: { title?: string; subtitle?: string; breadcrumb?: React.ReactNode; actions?: React.ReactNode } = {}) {
  return renderToString(
    createElement(TopBar, {
      title: props.title ?? "Admin Dashboard",
      ...props,
    }),
  );
}

describe("TopBar", () => {
  it("renders an <h1> with the title", () => {
    const html = render({ title: "Users" });
    expect(html).toContain("<h1");
    expect(html).toContain("Users");
  });

  it("does not render subtitle when not provided", () => {
    const html = render();
    // The subtitle <p> should not be present
    expect(html).not.toMatch(/<p[^>]*>/);
  });

  it("renders subtitle as a <p> when provided", () => {
    const html = render({ subtitle: "Welcome, Admin" });
    expect(html).toContain("<p");
    expect(html).toContain("Welcome, Admin");
  });

  it("renders breadcrumb when provided", () => {
    const html = render({
      breadcrumb: createElement("nav", null, "Admin / Users"),
    });
    expect(html).toContain("Admin / Users");
  });

  it("renders actions slot when provided", () => {
    const html = render({
      actions: createElement("button", null, "Create user"),
    });
    expect(html).toContain("Create user");
  });

  it("renders a <header> element", () => {
    const html = render();
    expect(html).toContain("<header");
    expect(html).toContain("</header>");
  });
});
