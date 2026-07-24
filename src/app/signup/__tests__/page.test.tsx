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
const signupFormSpy = vi.fn((_props: { errorKind: string | null }) =>
  createElement("div", null, createElement("h1", null, "Create your account")),
);

vi.mock("../SignupForm", () => ({
  SignupForm: (props: { errorKind: string | null }) => {
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
});
