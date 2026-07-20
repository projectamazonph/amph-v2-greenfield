/**
 * /verify-email — page contract tests.
 *
 * STORY-007: the user lands here from the link in their email.
 * - If `?token=...` is present, auto-submit a form to the
 *   verifyEmailAction.
 * - If `?error=<kind>` is present, show the error message.
 * - Otherwise, show a generic "click the link in your email" prompt.
 */

import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`__redirect__:${path}`);
  }),
}));

import { renderToString } from "react-dom/server";
import { createElement } from "react";
import VerifyEmailPage from "../page";

describe("/verify-email", () => {
  it("shows a click-the-link prompt when no token or error", async () => {
    const html = renderToString(
      await VerifyEmailPage({ searchParams: Promise.resolve({}) }),
    );
    expect(html).toMatch(/verification email/i);
  });

  it("auto-submits when ?token=... is present", async () => {
    const html = renderToString(
      await VerifyEmailPage({
        searchParams: Promise.resolve({ token: "abc123" }),
      }),
    );
    // Look for the auto-submit form. The token is stored in a
    // hidden field that gets posted to verifyEmailAction.
    expect(html).toMatch(/name="token"/);
    expect(html).toContain("abc123");
    expect(html).toMatch(/<form[^>]*method="post"/i);
  });

  it("shows the right error message for each error kind", async () => {
    for (const [slug, expectedText] of [
      ["missing-token", /missing/i],
      ["invalid-token", /invalid/i],
      ["expired", /expired/i],
      ["already-used", /already used/i],
    ] as const) {
      const html = renderToString(
        await VerifyEmailPage({
          searchParams: Promise.resolve({ error: slug }),
        }),
      );
      expect(html).toMatch(expectedText);
    }
  });

  it("links to /verify-email/sent for the resend flow", async () => {
    const html = renderToString(
      await VerifyEmailPage({ searchParams: Promise.resolve({}) }),
    );
    expect(html).toMatch(/href="\/verify-email\/sent"/);
  });

  it("does not contain banned marketing phrases", async () => {
    const html = renderToString(
      await VerifyEmailPage({ searchParams: Promise.resolve({}) }),
    );
    expect(html.toLowerCase()).not.toContain("delve");
    expect(html.toLowerCase()).not.toContain("leverage");
    expect(html.toLowerCase()).not.toContain("seamless");
  });
});
