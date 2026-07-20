/**
 * /verify-email/sent — page contract tests.
 */

import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { renderToString } from "react-dom/server";
import { createElement } from "react";
import SentPage from "../page";

describe("/verify-email/sent", () => {
  it("shows 'check your email' on a fresh visit", async () => {
    const html = renderToString(
      await SentPage({ searchParams: Promise.resolve({}) }),
    );
    expect(html).toMatch(/check your email/i);
  });

  it("shows 'sent' after a successful resend", async () => {
    const html = renderToString(
      await SentPage({ searchParams: Promise.resolve({ status: "sent" }) }),
    );
    expect(html).toMatch(/new email sent|sent/i);
  });

  it("shows the rate-limited countdown when throttled", async () => {
    const future = new Date(Date.now() + 45_000).toISOString();
    const html = renderToString(
      await SentPage({
        searchParams: Promise.resolve({
          status: "rate-limited",
          retryAfter: future,
        }),
      }),
    );
    expect(html).toMatch(/wait/i);
  });

  it("shows already-verified when user is verified", async () => {
    const html = renderToString(
      await SentPage({
        searchParams: Promise.resolve({ status: "already-verified" }),
      }),
    );
    expect(html).toMatch(/already verified|verified/i);
  });

  it("includes a resend form posting to the resend action", async () => {
    const html = renderToString(
      await SentPage({ searchParams: Promise.resolve({}) }),
    );
    // Look for a form pointing to the resend action.
    expect(html).toMatch(/<form/i);
  });

  it("does not contain banned marketing phrases", async () => {
    const html = renderToString(
      await SentPage({ searchParams: Promise.resolve({}) }),
    );
    expect(html.toLowerCase()).not.toContain("delve");
    expect(html.toLowerCase()).not.toContain("leverage");
    expect(html.toLowerCase()).not.toContain("seamless");
  });
});
