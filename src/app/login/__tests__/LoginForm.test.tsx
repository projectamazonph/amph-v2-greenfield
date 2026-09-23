/**
 * LoginForm — UI render contract.
 *
 * Pure presentational form: doesn't make network requests, doesn't read
 * cookies, doesn't hold client state. We render it directly with
 * renderToStaticMarkup and assert on what the operator sees.
 *
 * Story-161 regression: the TOTP field is conditionally rendered —
 * visible only after a `totp_required` or `invalid_totp_code` round-trip.
 * Before that change, a TOTP field with a "Only needed if you've
 * enabled two-factor" hint was always visible to every login attempt,
 * which is unnecessary noise for the >90% of accounts that don't
 * enroll 2FA.
 */

import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { LoginForm } from "../LoginForm";

function renderAtErrorKind(errorKind: string | null, googleEnabled = false): string {
  return renderToStaticMarkup(
    createElement(LoginForm, {
      redirectTo: "/dashboard",
      errorKind,
      googleEnabled,
    }),
  );
}

describe("LoginForm · STORY-161", () => {
  it("does not render the TOTP field on first paint (no error)", () => {
    const html = renderAtErrorKind(null);
    expect(html).not.toContain('name="totpCode"');
  });

  it("does not render the TOTP field for non-2FA error kinds", () => {
    const html = renderAtErrorKind("invalid_credentials");
    expect(html).not.toContain('name="totpCode"');
  });

  it("renders the TOTP field after a totp_required round-trip", () => {
    const html = renderAtErrorKind("totp_required");
    expect(html).toContain('name="totpCode"');
  });

  it("renders the TOTP field after an invalid_totp_code round-trip", () => {
    const html = renderAtErrorKind("invalid_totp_code");
    expect(html).toContain('name="totpCode"');
  });

  it("still renders email + password on every state", () => {
    for (const kind of [null, "invalid_credentials", "totp_required"]) {
      const html = renderAtErrorKind(kind);
      expect(html).toContain('name="email"');
      expect(html).toContain('name="password"');
    }
  });

  it("passes redirectTo through to the form so the route handler can honor it", () => {
    const html = renderToStaticMarkup(
      createElement(LoginForm, {
        redirectTo: "/pricing",
        errorKind: null,
      }),
    );
    expect(html).toContain('value="/pricing"');
  });
});
