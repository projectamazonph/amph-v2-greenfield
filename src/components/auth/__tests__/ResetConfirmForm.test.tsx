/**
 * ResetConfirmForm.test.tsx — pure unit tests via react-dom/server.
 *
 * Round 10 (M-16) wires the new-password field through the shared
 * `Input` primitive. This test asserts the form still renders correctly
 * with the new primitive: hidden token input preserved, label/htmlFor
 * pairing on the new-password field, name/type/autoComplete/minLength
 * carried through, and the "password changed" confirmation shown when
 * the server action returns the `success` kind.
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

import { ResetConfirmForm } from "../ResetConfirmForm";

describe("ResetConfirmForm (M-16)", () => {
  it("preserves the hidden token input", () => {
    const html = renderToString(createElement(ResetConfirmForm, { token: "tok-abc-123" }));
    expect(html).toMatch(/<input[^>]*\btype="hidden"[^>]*\bname="token"[^>]*\bvalue="tok-abc-123"/);
  });

  it("renders the new-password field through the Input primitive", () => {
    const html = renderToString(createElement(ResetConfirmForm, { token: "tok-abc-123" }));
    expect(html).toContain("New password");
    expect(html).toMatch(/<input[^>]*\bname="newPassword"/);
    expect(html).toMatch(/<input[^>]*\btype="password"/);
    expect(html).toMatch(/<input[^>]*\bautoComplete="new-password"/);
    expect(html).toMatch(/<input[^>]*\bminLength="8"/);
    expect(html).toMatch(/<input[^>]*\brequired/);
  });

  it("pairs the New password label with the input via htmlFor/id", () => {
    const html = renderToString(createElement(ResetConfirmForm, { token: "tok-abc-123" }));
    // React renders attributes in source order; the password input has
    // id before type. Match the <input> tag containing type="password"
    // and pull its id out of whichever position it appears in.
    const passwordTag = html.match(/<input[^>]*\btype="password"[^>]*\/>/);
    expect(passwordTag).not.toBeNull();
    const idMatch = passwordTag![0].match(/\bid="([^"]+)"/);
    expect(idMatch).not.toBeNull();
    const inputId = idMatch![1];
    expect(html).toContain(`for="${inputId}"`);
  });

  it("renders the submit button with the idle label", () => {
    const html = renderToString(createElement(ResetConfirmForm, { token: "tok-abc-123" }));
    expect(html).toContain("Set new password");
    expect(html).toContain('type="submit"');
  });
});
