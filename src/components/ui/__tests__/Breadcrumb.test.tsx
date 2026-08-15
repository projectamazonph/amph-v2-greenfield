import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Breadcrumb } from "../Breadcrumb";

describe("Breadcrumb", () => {
  it("renders a nav with aria-label=Breadcrumb", () => {
    const html = renderToStaticMarkup(
      <Breadcrumb items={[{ href: "/tools", label: "Tools" }, { label: "Bid Elevator" }]} />,
    );
    expect(html).toContain('aria-label="Breadcrumb"');
  });

  it("renders an ordered list", () => {
    const html = renderToStaticMarkup(
      <Breadcrumb items={[{ href: "/tools", label: "Tools" }, { label: "Bid Elevator" }]} />,
    );
    expect(html).toContain("<ol");
    expect(html).toContain("</ol>");
  });

  it("renders a link for items with href", () => {
    const html = renderToStaticMarkup(
      <Breadcrumb items={[{ href: "/tools", label: "Tools" }, { label: "Bid Elevator" }]} />,
    );
    expect(html).toContain('href="/tools"');
    expect(html).toContain("Tools");
  });

  it("marks the last item as current page", () => {
    const html = renderToStaticMarkup(
      <Breadcrumb items={[{ href: "/tools", label: "Tools" }, { label: "Bid Elevator" }]} />,
    );
    expect(html).toContain('aria-current="page"');
    expect(html).toContain("Bid Elevator");
  });

  it("renders separators between items", () => {
    const html = renderToStaticMarkup(
      <Breadcrumb items={[{ href: "/tools", label: "Tools" }, { label: "Bid Elevator" }]} />,
    );
    // One separator between two items
    expect(html.match(/aria-hidden/g)?.length ?? 0).toBeGreaterThan(0);
  });

  it("handles a single-item breadcrumb (current page only)", () => {
    const html = renderToStaticMarkup(<Breadcrumb items={[{ label: "Dashboard" }]} />);
    expect(html).toContain("Dashboard");
    expect(html).toContain('aria-current="page"');
  });

  it("handles deep navigation paths", () => {
    const html = renderToStaticMarkup(
      <Breadcrumb
        items={[
          { href: "/courses", label: "Courses" },
          { href: "/courses/ppc-foundations", label: "PPC Foundations" },
          { label: "Lesson 1" },
        ]}
      />,
    );
    expect(html).toContain('href="/courses"');
    expect(html).toContain('href="/courses/ppc-foundations"');
    expect(html).toContain("Lesson 1");
  });

  it("renders an item with href as a link, not a current-page span", () => {
    const html = renderToStaticMarkup(
      <Breadcrumb items={[{ href: "/tools", label: "Tools" }, { label: "Bid Elevator" }]} />,
    );
    // The 'Tools' item should be a link (not aria-current)
    expect(html).toMatch(/<a[^>]*href="\/tools"[^>]*>Tools<\/a>/);
  });

  it("does not render a separator after the last item", () => {
    const html = renderToStaticMarkup(
      <Breadcrumb items={[{ href: "/tools", label: "Tools" }, { label: "Bid Elevator" }]} />,
    );
    // The last item should not have a trailing caret separator right after it
    expect(html).not.toMatch(/Bid Elevator<\/span>[\s\S]*aria-hidden/);
  });

  it("passes className through to the nav element", () => {
    const html = renderToStaticMarkup(
      <Breadcrumb
        items={[{ href: "/tools", label: "Tools" }, { label: "Bid Elevator" }]}
        className="custom-class"
      />,
    );
    expect(html).toContain("custom-class");
  });
});
