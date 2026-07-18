/**
 * Input.test.tsx — pure unit tests via react-dom/server.
 */

import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import { createElement } from "react";
import { Input } from "../Input";

function render(
  props: Record<string, unknown> = {},
) {
  return renderToString(createElement(Input, props));
}

function hasClassToken(html: string, token: string): boolean {
  const match = html.match(/class="([^"]+)"/);
  if (!match || !match[1]) return false;
  return match[1].split(/\s+/).some((c) => c.includes(token));
}

describe("Input", () => {
  it("renders an <input> element", () => {
    const html = render();
    expect(html).toMatch(/<input[^>]*\/?>/);
  });

  it("renders no label by default", () => {
    const html = render();
    expect(html).not.toContain("<label");
  });

  it("renders label when provided", () => {
    const html = render({ label: "Email" });
    expect(html).toContain("<label");
    expect(html).toContain("Email");
  });

  it("associates label with input via htmlFor/id", () => {
    const html = render({ label: "Email", name: "email" });
    const idMatch = html.match(/<input[^>]*\bid="([^"]+)"/);
    expect(idMatch).not.toBeNull();
    const inputId = idMatch![1];
    expect(html).toContain(`for="${inputId}"`);
  });

  it("renders hint when provided (no error)", () => {
    const html = render({ hint: "We'll never share your email" });
    expect(html).toContain("We&#x27;ll never share your email");
  });

  it("does not render hint when error is present", () => {
    const html = render({ hint: "Hint", error: "Required" });
    expect(html).not.toContain("Hint");
    expect(html).toContain("Required");
  });

  it("renders error when provided", () => {
    const html = render({ error: "Email is required" });
    expect(html).toContain("Email is required");
    expect(html).toContain("role=\"alert\"");
  });

  it("applies error class to input when error present", () => {
    const html = render({ error: "Bad" });
    // The error class lives on the <input>, not the wrapper
    const inputMatch = html.match(/<input[^>]*class="([^"]+)"/);
    expect(inputMatch).not.toBeNull();
    expect(inputMatch![1]).toContain("error");
  });

  it("sets aria-invalid when error present", () => {
    const html = render({ error: "Bad" });
    expect(html).toContain('aria-invalid="true"');
  });

  it("does not set aria-invalid when no error", () => {
    const html = render();
    expect(html).not.toContain("aria-invalid");
  });

  it("applies size class for sm", () => {
    const html = render({ size: "sm" });
    const inputMatch = html.match(/<input[^>]*class="([^"]+)"/);
    expect(inputMatch![1]).toContain("sm");
  });

  it("applies size class for lg", () => {
    const html = render({ size: "lg" });
    const inputMatch = html.match(/<input[^>]*class="([^"]+)"/);
    expect(inputMatch![1]).toContain("lg");
  });

  it("defaults to md size", () => {
    const html = render();
    const inputMatch = html.match(/<input[^>]*class="([^"]+)"/);
    expect(inputMatch![1]).toContain("md");
  });

  it("passes through name, type, value, placeholder", () => {
    const html = render({
      name: "email",
      type: "email",
      value: "user@example.com",
      placeholder: "you@domain.com",
    });
    expect(html).toContain('name="email"');
    expect(html).toContain('type="email"');
    expect(html).toContain('value="user@example.com"');
    expect(html).toContain('placeholder="you@domain.com"');
  });

  it("passes through disabled and required", () => {
    const html = render({ disabled: true, required: true });
    expect(html).toContain("disabled");
    expect(html).toContain("required");
  });

  it("renders rightAdornment when provided", () => {
    const html = render({
      rightAdornment: createElement("span", null, "👁"),
    });
    expect(html).toContain("👁");
  });

  it("links hint via aria-describedby", () => {
    const html = render({ label: "Email", hint: "Hint text" });
    const inputMatch = html.match(/<input[^>]*aria-describedby="([^"]+)"/);
    expect(inputMatch).not.toBeNull();
    const describedBy = inputMatch![1];
    expect(describedBy).toContain("hint");
  });

  it("links error via aria-describedby", () => {
    const html = render({ label: "Email", error: "Bad" });
    const inputMatch = html.match(/<input[^>]*aria-describedby="([^"]+)"/);
    expect(inputMatch).not.toBeNull();
    const describedBy = inputMatch![1];
    expect(describedBy).toContain("error");
  });
});
