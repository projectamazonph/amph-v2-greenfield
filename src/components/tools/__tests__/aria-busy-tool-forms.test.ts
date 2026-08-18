/**
 * aria-busy-tool-forms.test.tsx — M-08 audit fix verification.
 *
 * WCAG 4.1.2 *Name, Role, Value* and the audit item M-08 in
 * `docs/UI-ACCESSIBILITY-AUDIT-2026-08-14.md` require that submit buttons
 * in student-facing tool forms expose their pending state to assistive
 * technology. Before the fix, every tool form set `disabled={pending}`
 * (correctly removing the button from the tab order and the click target)
 * but never set `aria-busy={pending}`, so screen-reader users heard the
 * button announce "disabled" with no explanation that a server round-trip
 * was in flight. The fix wires `aria-busy={pending}` onto each submit
 * button so the assistive-tech announcement carries the busy signal.
 *
 * These forms are client components that cannot be pre-rendered with
 * `renderToString` (they depend on `useTransition` and `useState` from a
 * React client tree). The Round 14 fix on `CheckoutForm.tsx` established
 * the source-string assertion pattern for the same reason. Each assertion
 * below checks the actual source file for the literal `aria-busy={pending}`
 * fragment appearing inside a submit-style button tag, paired with a
 * `disabled={...}` clause on the same element.
 *
 * The anchor substring below is the **idle-state label** as it appears
 * literally in each source file — the JSX expression
 * `{pending ? "Running…" : "Run simulation"}` contains `"Run simulation"`
 * as the idle text, and we anchor on that string to bound the search to
 * the right button element.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("Tool form submit buttons — M-08 aria-busy wiring", () => {
  const cases: ReadonlyArray<{ file: string; anchor: string; expectedLabel: string }> = [
    {
      file: "../BidElevatorForm.tsx",
      anchor: `"Run simulation"`,
      expectedLabel: "Run simulation",
    },
    {
      file: "../KeywordResearchForm.tsx",
      anchor: `"Generate keywords"`,
      expectedLabel: "Generate keywords",
    },
    {
      file: "../KeywordResearchForm.tsx",
      anchor: `"Check my keyword decisions"`,
      expectedLabel: "Check my keyword decisions",
    },
    {
      file: "../StrTriageForm.tsx",
      anchor: `"Check my decisions"`,
      expectedLabel: "Check my decisions",
    },
    {
      file: "../ListingAuditForm.tsx",
      anchor: `"Run audit"`,
      expectedLabel: "Run audit",
    },
    {
      file: "../ListingAuditForm.tsx",
      anchor: `"Check my audit decisions"`,
      expectedLabel: "Check my audit decisions",
    },
  ];

  for (const { file, anchor, expectedLabel } of cases) {
    it(`binds aria-busy={pending} on the "${expectedLabel}" button (${file})`, () => {
      const source = readFileSync(resolve(__dirname, file), "utf8");
      const anchorIndex = source.lastIndexOf(anchor);
      expect(
        anchorIndex,
        `idle label anchor ${anchor} should appear in ${file}`,
      ).toBeGreaterThan(-1);
      // Walk back to the nearest preceding `<button` opener so the
      // assertions cover only this button's attributes.
      const opener = source.lastIndexOf("<button", anchorIndex);
      expect(
        opener,
        `preceding <button opener should exist for the "${expectedLabel}" button`,
      ).toBeGreaterThan(-1);
      const buttonSnippet = source.slice(opener, anchorIndex + anchor.length + 2);
      expect(
        buttonSnippet,
        `"${expectedLabel}" button should declare disabled={pending...}`,
      ).toMatch(/\bdisabled=\{pending[^}]*\}/);
      expect(
        buttonSnippet,
        `"${expectedLabel}" button should declare aria-busy={pending} (M-08 fix)`,
      ).toMatch(/\baria-busy=\{pending\}/);
    });
  }

  it("binds aria-busy={pending} on the CampaignBuilderForm submit Button", () => {
    // CampaignBuilderForm uses the shared <Button> primitive from
    // @/components/ui, which spreads ButtonHTMLAttributes through. The
    // audit applies the same way: the submit Button must expose
    // `aria-busy={pending}` to assistive technology while grading.
    const source = readFileSync(resolve(__dirname, "../CampaignBuilderForm.tsx"), "utf8");
    const anchor = `"Check my campaign"`;
    const anchorIndex = source.lastIndexOf(anchor);
    expect(anchorIndex, `idle label anchor should appear`).toBeGreaterThan(-1);
    const opener = source.lastIndexOf("<Button", anchorIndex);
    expect(opener, `preceding <Button opener should exist`).toBeGreaterThan(-1);
    const buttonSnippet = source.slice(opener, anchorIndex + anchor.length + 2);
    expect(
      buttonSnippet,
      `CampaignBuilderForm submit Button should declare disabled={pending || graded}`,
    ).toMatch(/\bdisabled=\{pending \|\| graded\}/);
    expect(
      buttonSnippet,
      `CampaignBuilderForm submit Button should declare aria-busy={pending} (M-08 fix)`,
    ).toMatch(/\baria-busy=\{pending\}/);
  });
});
