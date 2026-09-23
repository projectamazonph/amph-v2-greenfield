/**
 * /signup — page render contract.
 *
 * A visitor who has not submitted the form must not see a validation
 * error on first paint. The page also must pass `?error=...` through
 * to <SignupForm /> so the form can render the right alert.
 *
 * STORY-066 follow-up: the page is now a server component that reads
 * `?error=...` from searchParams (server-side) and passes it to
 * `<SignupForm />` as a prop. The form is a client component, but
 * we mock it here because (a) it's the form's job to render the
 * alert, not the page's, and (b) the form's submit behavior is
 * fully covered by the E2E test (tests/e2e/signup.spec.ts).
 *
 * We render via `renderToReadableStream` (React 19 async SSR).
 */

import { createElement } from "react";
import { renderToReadableStream } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

// Spy on the form so we can assert on the props the page passes
// (which is the page's only job: turn the URL into props).
const signupFormSpy = vi.fn((_props: { errorKind: string | null; tierSlug: string | null }) =>
  createElement("div", null, createElement("h1", null, "Create your account")),
);

vi.mock("../SignupForm", () => ({
  SignupForm: (props: { errorKind: string | null; tierSlug: string | null }) => {
    signupFormSpy(props);
    return createElement("div", null, createElement("h1", null, "Create your account"));
  },
}));

import SignUpPage from "../page";

async function renderPage(searchParams: Record<string, string> = {}) {
  signupFormSpy.mockClear();
  const element = createElement(SignUpPage, { searchParams: Promise.resolve(searchParams) });
  const stream = await renderToReadableStream(element);
  const reader = stream.getReader();
  let html = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    html += new TextDecoder().decode(value);
  }
  return html;
}

describe("/signup", () => {
  it("does not show a validation error on first paint", async () => {
    const html = await renderPage();

    expect(html).toContain("Create your account");
    expect(html).not.toContain("Please fill in all fields.");
    expect(html).not.toContain("alert-error");
  });

  it("passes ?error= through to SignupForm as errorKind", async () => {
    await renderPage({ error: "email_taken" });

    expect(signupFormSpy).toHaveBeenCalledWith(
      expect.objectContaining({ errorKind: "email_taken" }),
    );
  });

  it("passes errorKind=null when no error is set", async () => {
    await renderPage();

    expect(signupFormSpy).toHaveBeenCalledWith(expect.objectContaining({ errorKind: null }));
  });

  it("preserves the selected pricing tier through signup", async () => {
    await renderPage({ tier: "mastery" });

    expect(signupFormSpy).toHaveBeenCalledWith(expect.objectContaining({ tierSlug: "mastery" }));
  });
});

// Story-161: the new terms + payment-method line and the tier-aware
// submit copy are tested by inspecting the SignupForm directly. The
// `vi.mock("../SignupForm")` above intercepts the dynamic import
// path too, so we use `vi.importActual` to grab the real module
// without disturbing the page-level mock.
async function loadRealSignupForm(): Promise<{ default: unknown }> {
  return vi.importActual("../SignupForm") as Promise<{ default: unknown }>;
}

async function renderRealSignupForm(props: {
  errorKind: string | null;
  tierSlug: string | null;
}): Promise<string> {
  const { SignupForm } = (await loadRealSignupForm()) as unknown as {
    SignupForm: (p: { errorKind: string | null; tierSlug: string | null }) => Promise<unknown>;
  };
  const stream = await renderToReadableStream(createElement(SignupForm as never, props));
  const reader = stream.getReader();
  let html = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    html += new TextDecoder().decode(value);
  }
  return html;
}

describe("SignupForm · STORY-161", () => {
  it("renders the terms + payment-method line above the submit button", async () => {
    const html = await renderRealSignupForm({ errorKind: null, tierSlug: null });
    expect(html).toContain("By creating an account you accept the platform terms");
    expect(html).toContain("PayMongo handles card");
  });

  it("uses the tier-aware submit copy when a tierSlug is present", async () => {
    const html = await renderRealSignupForm({ errorKind: null, tierSlug: "mastery" });
    expect(html).toContain("Create account and continue");
  });

  it("uses the plain submit copy when no tierSlug is present", async () => {
    const html = await renderRealSignupForm({ errorKind: null, tierSlug: null });
    expect(html).toContain("Create account");
  });
});
