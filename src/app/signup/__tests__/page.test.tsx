/**
 * /signup — initial render contract.
 *
 * A visitor has not submitted the form yet, so the first paint must not
 * present a validation error. This prevents a confusing, visually noisy
 * alert at the top of the account-creation card.
 */

import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/actions/signup.action", () => ({
  signUpAction: vi.fn(),
}));

import SignUpPage from "../page";

describe("/signup", () => {
  it("does not show a validation error before the student submits", () => {
    const html = renderToString(createElement(SignUpPage));

    expect(html).toContain("Create your account");
    expect(html).not.toContain("Please fill in all fields.");
    expect(html).not.toContain("alert-error");
  });
});
