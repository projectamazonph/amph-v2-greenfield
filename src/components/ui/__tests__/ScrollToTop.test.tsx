import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ScrollToTop } from "../ScrollToTop";

describe("ScrollToTop", () => {
  it("renders a button with aria-label=Scroll to top", () => {
    const html = renderToStaticMarkup(<ScrollToTop />);
    expect(html).toContain('aria-label="Scroll to top"');
  });

  it("renders a button element with type=button", () => {
    const html = renderToStaticMarkup(<ScrollToTop />);
    expect(html).toMatch(/<button[^>]*type="button"[^>]*>/);
  });

  it("starts hidden (aria-hidden=true, tabIndex=-1)", () => {
    const html = renderToStaticMarkup(<ScrollToTop />);
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('tabindex="-1"');
  });

  it("hides from keyboard while invisible", () => {
    const html = renderToStaticMarkup(<ScrollToTop />);
    expect(html).toMatch(/tabindex="-1"/);
  });

  it("renders a title for hover tooltip", () => {
    const html = renderToStaticMarkup(<ScrollToTop />);
    expect(html).toContain('title="Scroll to top"');
  });

  it("renders a static icon (svg)", () => {
    const html = renderToStaticMarkup(<ScrollToTop />);
    expect(html).toContain("<svg");
  });

  it("uses a button class for styling", () => {
    const html = renderToStaticMarkup(<ScrollToTop />);
    expect(html).toContain("button");
  });

  it("does not include the visible class initially", () => {
    const html = renderToStaticMarkup(<ScrollToTop />);
    // The visible class is omitted on the server-rendered snapshot
    // because the useState(false) starts hidden.
    expect(html).not.toMatch(/visible/);
  });
});
