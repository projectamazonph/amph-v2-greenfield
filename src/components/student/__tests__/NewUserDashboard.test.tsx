/**
 * NewUserDashboard — first-run dashboard variant (STORY-146).
 *
 * Server component: renderToString covers the static markup and
 * preserves the SSR-friendly contract used elsewhere in this folder.
 */

import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import { NewUserDashboard } from "../NewUserDashboard";

describe("NewUserDashboard", () => {
  it("greets the user by first name", () => {
    // React inserts <!-- --> comment nodes between adjacent text
    // expressions (e.g. the literal "Welcome to AMPH, " and the
    // {user.firstName} interpolation). Match each segment rather than
    // the concatenated string so the assertion is stable across
    // React's text-segmenting behavior.
    const html = renderToString(<NewUserDashboard user={{ firstName: "Maria" }} />);
    expect(html).toContain("Welcome to AMPH,");
    expect(html).toContain("Maria");
  });

  it("links Browse courses to /courses", () => {
    const html = renderToString(<NewUserDashboard user={{ firstName: "Maria" }} />);
    // The hero CTA is the "Browse courses" link — assert both the
    // /courses href and the button label are present.
    expect(html).toContain('href="/courses"');
    expect(html).toContain("Browse courses");
  });

  it("renders three what-you'll-find cards (Courses, Dashboard, Simulators)", () => {
    const html = renderToString(<NewUserDashboard user={{ firstName: "Maria" }} />);
    expect(html).toContain("Courses");
    expect(html).toContain("Dashboard");
    expect(html).toContain("Simulators");
    expect(html).toContain('aria-label="What you&#x27;ll find"');
  });

  it("links FAQ in the footer", () => {
    const html = renderToString(<NewUserDashboard user={{ firstName: "Maria" }} />);
    expect(html).toContain('href="/faq"');
    expect(html).toContain("Visit the FAQ");
  });
});
