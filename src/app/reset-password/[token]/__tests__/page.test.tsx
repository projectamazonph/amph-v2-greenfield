/**
 * /reset-password/[token] — page contract tests.
 */

import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { renderToString } from "react-dom/server";
import { createElement } from "react";
import ResetConfirmPage from "../page";

describe("/reset-password/[token]", () => {
  it("renders a form with a hidden token field", async () => {
    const html = renderToString(
      await ResetConfirmPage({
        params: Promise.resolve({ token: "abc123" }),
      }),
    );
    expect(html).toMatch(/<form/i);
    expect(html).toMatch(/name="token"/);
    expect(html).toMatch(/value="abc123"/);
  });

  it("includes a new-password input", async () => {
    const html = renderToString(
      await ResetConfirmPage({
        params: Promise.resolve({ token: "abc123" }),
      }),
    );
    expect(html).toMatch(/name="newPassword"/);
  });

  it("does not contain banned marketing phrases", async () => {
    const html = renderToString(
      await ResetConfirmPage({
        params: Promise.resolve({ token: "abc123" }),
      }),
    );
    expect(html.toLowerCase()).not.toContain("delve");
    expect(html.toLowerCase()).not.toContain("leverage");
    expect(html.toLowerCase()).not.toContain("seamless");
  });
});
