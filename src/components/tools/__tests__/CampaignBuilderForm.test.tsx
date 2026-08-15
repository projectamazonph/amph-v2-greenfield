/**
 * CampaignBuilderForm.test.tsx — C-04 audit fix verification.
 *
 * WCAG 3.3.2 *Labels or Instructions* (Level A) requires every input to
 * have a programmatic label so screen readers do not rely on placeholder
 * text. The C-04 fix added a real <label className="sr-only" htmlFor=...>
 * before each of the five placeholder-only inputs in the campaign builder.
 * This test drives the client component through @testing-library/react
 * using fireEvent (the test environment is node + jsdom, so userEvent's
 * extended setup is not available). The pattern mirrors the existing
 * `useUnsavedChanges.test.tsx` that already runs in the same node +
 * jsdom setup.
 */

import { JSDOM } from "jsdom";

const dom = new JSDOM('<!DOCTYPE html><html><body><div id="root"></div></body></html>', {
  url: "http://localhost/",
  pretendToBeVisual: true,
});
globalThis.document = dom.window.document;
globalThis.window = dom.window as unknown as Window & typeof globalThis;
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.HTMLInputElement = dom.window.HTMLInputElement;
globalThis.HTMLSelectElement = dom.window.HTMLSelectElement;
globalThis.Node = dom.window.Node;
globalThis.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/react";
import React from "react";

vi.mock("@/app/tools/campaign-builder/actions", () => ({
  campaignBuilderAttempt: vi.fn().mockResolvedValue({ ok: false, error: { message: "stub" } }),
}));

beforeEach(() => {
  // Discard reset between tests so the per-test userRandom ID generator
  // (localIdCounter inside the component) starts afresh. The component
  // does not export this hook, so we rely on the mock state isolation.
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

describe("CampaignBuilderForm — C-04 label pairing", () => {
  const baseProps = {
    productCategory: "Electronics",
    productNiche: "wireless earbuds",
    monthlyBudget: 50000,
    challengeUnlocked: false,
  };

  it("associates the campaign name input with a paired <label htmlFor>", async () => {
    const { CampaignBuilderForm } = await import("../CampaignBuilderForm");
    const { getByRole } = render(React.createElement(CampaignBuilderForm, { ...baseProps }));

    // The campaign list starts empty. Click "Add campaign" to render the
    // first campaign row, which contains the campaign name input.
    fireEvent.click(getByRole("button", { name: /\+ add campaign/i }));

    const nameInput = document.getElementById("cb-campaign-0-name") as HTMLInputElement | null;
    expect(nameInput).not.toBeNull();
    expect(nameInput!.getAttribute("placeholder")).toMatch(/campaign name/i);

    const label = document.querySelector('label[for="cb-campaign-0-name"]');
    expect(label).not.toBeNull();
    expect(label!.textContent).toMatch(/campaign 1 name/i);
    expect(label!.className).toContain("sr-only");
  });

  it("associates the ad group name input with a paired <label htmlFor>", async () => {
    const { CampaignBuilderForm } = await import("../CampaignBuilderForm");
    const { getByRole } = render(React.createElement(CampaignBuilderForm, { ...baseProps }));

    fireEvent.click(getByRole("button", { name: /\+ add campaign/i }));
    fireEvent.click(getByRole("button", { name: /\+ add ad group/i }));

    const input = document.getElementById(
      "cb-campaign-0-adgroup-0-name",
    ) as HTMLInputElement | null;
    expect(input).not.toBeNull();
    expect(input!.getAttribute("placeholder")).toMatch(/ad group name/i);

    const label = document.querySelector('label[for="cb-campaign-0-adgroup-0-name"]');
    expect(label).not.toBeNull();
    expect(label!.textContent).toMatch(/ad group 1 name in campaign 1/i);
  });

  it("associates the keyword input with a paired <label htmlFor>", async () => {
    const { CampaignBuilderForm } = await import("../CampaignBuilderForm");
    const { getByRole } = render(React.createElement(CampaignBuilderForm, { ...baseProps }));

    fireEvent.click(getByRole("button", { name: /\+ add campaign/i }));
    fireEvent.click(getByRole("button", { name: /\+ add ad group/i }));
    fireEvent.click(getByRole("button", { name: /\+ add keyword/i }));

    const input = document.getElementById(
      "cb-campaign-0-adgroup-0-keyword-0",
    ) as HTMLInputElement | null;
    expect(input).not.toBeNull();
    expect(input!.getAttribute("placeholder")).toBe("Keyword");

    const label = document.querySelector('label[for="cb-campaign-0-adgroup-0-keyword-0"]');
    expect(label).not.toBeNull();
    expect(label!.textContent).toMatch(/keyword 1 in ad group 1 of campaign 1/i);
  });

  it("associates the negative keyword text input with a paired <label htmlFor>", async () => {
    const { CampaignBuilderForm } = await import("../CampaignBuilderForm");
    const { getByRole } = render(React.createElement(CampaignBuilderForm, { ...baseProps }));

    fireEvent.click(getByRole("button", { name: /\+ add campaign/i }));
    fireEvent.click(getByRole("button", { name: /\+ add negative keyword/i }));

    const input = document.getElementById(
      "cb-campaign-0-negative-0-text",
    ) as HTMLInputElement | null;
    expect(input).not.toBeNull();
    expect(input!.getAttribute("placeholder")).toBe("Negative keyword text");

    const label = document.querySelector('label[for="cb-campaign-0-negative-0-text"]');
    expect(label).not.toBeNull();
    expect(label!.textContent).toMatch(/negative keyword 1 text in campaign 1/i);
  });

  it("associates the negative keyword reason input with a paired <label htmlFor>", async () => {
    const { CampaignBuilderForm } = await import("../CampaignBuilderForm");
    const { getByRole } = render(React.createElement(CampaignBuilderForm, { ...baseProps }));

    fireEvent.click(getByRole("button", { name: /\+ add campaign/i }));
    fireEvent.click(getByRole("button", { name: /\+ add negative keyword/i }));

    const input = document.getElementById(
      "cb-campaign-0-negative-0-reason",
    ) as HTMLInputElement | null;
    expect(input).not.toBeNull();
    expect(input!.getAttribute("placeholder")).toMatch(/reason/i);

    const label = document.querySelector('label[for="cb-campaign-0-negative-0-reason"]');
    expect(label).not.toBeNull();
    expect(label!.textContent).toMatch(/reason for negative keyword 1 in campaign 1/i);
  });

  it("does not leave the affected inputs with only placeholder as their label", async () => {
    const { CampaignBuilderForm } = await import("../CampaignBuilderForm");
    const { getByRole } = render(React.createElement(CampaignBuilderForm, { ...baseProps }));

    // Build a full content tree: campaign -> ad group -> keyword, plus a
    // negative keyword on the campaign. Then verify every C-04 input has
    // a paired <label>, no longer relying on the placeholder alone.
    fireEvent.click(getByRole("button", { name: /\+ add campaign/i }));
    fireEvent.click(getByRole("button", { name: /\+ add ad group/i }));
    fireEvent.click(getByRole("button", { name: /\+ add keyword/i }));
    fireEvent.click(getByRole("button", { name: /\+ add negative keyword/i }));

    const c04Inputs = [
      "cb-campaign-0-name",
      "cb-campaign-0-adgroup-0-name",
      "cb-campaign-0-adgroup-0-keyword-0",
      "cb-campaign-0-negative-0-text",
      "cb-campaign-0-negative-0-reason",
    ] as const;

    for (const id of c04Inputs) {
      const input = document.getElementById(id) as HTMLInputElement | null;
      expect(input, `input #${id} should exist`).not.toBeNull();
      const label = document.querySelector(`label[for="${id}"]`);
      expect(label, `<label for=${id}> should exist`).not.toBeNull();
      // The C-04 inputs are the ones that previously relied on placeholder;
      // they must keep the placeholder (as a hint) AND have a label.
      expect(
        input!.getAttribute("placeholder"),
        `input #${id} keeps placeholder as hint`,
      ).toBeTruthy();
    }
  });
});
