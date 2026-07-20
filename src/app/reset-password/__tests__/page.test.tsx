/* eslint-disable no-restricted-syntax */
/**
 * /reset-password — page contract tests.
 */

import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { renderToString } from "react-dom/server";
import { createElement } from "react";
import ResetRequestPage from "../page";

describe("/reset-password", () => {
  it("renders the request form", () => {
    const html = renderToString(createElement(ResetRequestPage));
    expect(html).toMatch(/<form/i);
    expect(html).toMatch(/name="email"/);
  });

  it("shows the always-sent copy", () => {
    const html = renderToString(createElement(ResetRequestPage));
    expect(html).toMatch(/check your email/i);
  });

  it("links to /login", () => {
    const html = renderToString(createElement(ResetRequestPage));
    expect(html).toMatch(/href="\/login"/);
  });

  it("does not contain banned marketing phrases", () => {
    const html = renderToString(createElement(ResetRequestPage));
    expect(html.toLowerCase()).not.toContain("delve");
    expect(html.toLowerCase()).not.toContain("leverage");
    expect(html.toLowerCase()).not.toContain("seamless");
  });
});
