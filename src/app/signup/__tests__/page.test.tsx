/**
 * /signup — initial render contract.
 *
 * A visitor has not submitted the form yet, so the first paint must not
 * present a validation error. This prevents a confusing, visually noisy
 * alert at the top of the account-creation card.
 *
 * STORY-046 follow-up: the page is now a thin server component that
 * renders <Suspense><SignupForm /></Suspense>. The SignupForm client
 * component is mocked here because (a) it calls useSearchParams (which
 * throws under renderToString without the Next router context) and
 * (b) the form's submit behavior is fully covered by the E2E test
 * (tests/e2e/signup.spec.ts) and the action's unit tests
 * (src/app/actions/__tests__/signup.action.test.ts).
 */

import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

// Mock the form so renderToString doesn't trip on useSearchParams
// (which requires the Next.js router context, unavailable in node:test).
vi.mock("../SignupForm", () => ({
  SignupForm: () => createElement("div", null, createElement("h1", null, "Create your account")),
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
