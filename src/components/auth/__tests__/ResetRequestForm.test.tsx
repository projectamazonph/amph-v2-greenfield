/**
 * ResetRequestForm.test.tsx — pure unit tests via react-dom/server.
 *
 * Round 10 (M-16) wires the email field through the shared `Input`
 * primitive. This test asserts the form still renders correctly with
 * the new primitive: label/htmlFor pairing preserved, name/type/
 * autoComplete/required carried through, and the "check your inbox"
 * confirmation shown when the server action returns the `sent` kind.
 *
 * The server action module is mocked so the test can run in the node
 * environment without pulling in `next/headers` and the composition
 * container.
 */

import { describe, it, expect, vi } from "vitest";
import { renderToString } from "react-dom/server";
import { createElement } from "react";

vi.mock("@/app/actions/authPasswordReset.action", () => ({
  requestPasswordResetAction: () => undefined,
  resetPasswordAction: () => undefined,
  initialRequestResetState: { kind: "idle" },
}));

import { ResetRequestForm } from "../ResetRequestForm";

describe("ResetRequestForm (M-16)", () => {
  it("renders the email field through the Input primitive", () => {
    const html = renderToString(createElement(ResetRequestForm));
    expect(html).toContain("Email");
    expect(html).toMatch(/<input[^>]*\bname="email"/);
    expect(html).toMatch(/<input[^>]*\btype="email"/);
    expect(html).toMatch(/<input[^>]*\bautoComplete="email"/);
    expect(html).toMatch(/<input[^>]*\brequired/);
  });

  it("pairs the Email label with the input via htmlFor/id", () => {
    const html = renderToString(createElement(ResetRequestForm));
    const idMatch = html.match(/<input[^>]*\bid="([^"]+)"/);
    expect(idMatch).not.toBeNull();
    const inputId = idMatch![1];
    expect(html).toContain(`for="${inputId}"`);
  });

  it("renders the submit button with the idle label", () => {
    const html = renderToString(createElement(ResetRequestForm));
    expect(html).toContain("Send reset link");
    expect(html).toContain('type="submit"');
  });
});
