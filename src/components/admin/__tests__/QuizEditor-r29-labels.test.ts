/**
 * Round 29 — pin the WCAG 3.3.2 / 4.1.2 contract on QuizEditor input labels.
 *
 * Audit bullet C-03 (docs/UI-ACCESSIBILITY-AUDIT-2026-08-14.md lines 62-67):
 *   "QuizEditor inputs use placeholder as the only label.
 *    Question text and option text inputs use only `placeholder="Question text…"` /
 *    `placeholder={`Option ${oIndex + 1} text…`}`. Screen readers will not announce
 *    the field name, and low-vision users lose context the moment they start typing.
 *    Fix: Add a proper `<label className="visually-hidden" htmlFor={...}>` (or a
 *    top-of-field label) and ensure `id` is set on the input."
 *
 * The earlier interim fix used `aria-label` on the inputs. That works for screen
 * readers (WCAG 3.3.2 accepts aria-label as a label mechanism) but loses the
 * other affordances of a real `<label>`:
 *   - Sighted keyboard / mouse users cannot click the label to focus the input
 *   - Voice-control software (Dragon, Voice Control) cannot say "click <label>"
 *   - Browser autofill heuristics prefer `<label>` for credit-card / address forms
 *   - The `<label>` association is the canonical pattern that every a11y lint
 *     tool (eslint-plugin-jsx-a11y/label-has-associated-control) checks for
 *
 * Round 29 replaces the `aria-label` overrides on the question-text and
 * option-text inputs with proper sr-only `<label htmlFor>` elements. The
 * placeholder stays as an inline hint (not the only label). The visible "Q{n}"
 * badge becomes `<label aria-hidden>` so it remains a row marker without
 * competing for the screen-reader announcement.
 *
 * This test pins:
 *   1. The question text input no longer carries `aria-label={...Question...}`
 *   2. The option text input no longer carries `aria-label={...Option...}`
 *   3. Both inputs have a matching `<label htmlFor={id} className="sr-only">`
 *      element on the same row
 *   4. The radio button (toggle for "this is the correct option") keeps its
 *      `aria-label` since it has no visible text to associate with
 *   5. The M-R29 doc block cites WCAG 3.3.2 and 4.1.2
 *
 * Mirrors the source-string pattern from rounds 16-28 (Field Manual §5
 * box-shadow sweep, etc.). Tests are co-located next to the component under
 * test because the round's central change is in `src/components/admin/
 * QuizEditor.tsx`.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const QUIZ_EDITOR = "src/components/admin/QuizEditor.tsx";

function readQuizEditor(): string {
  return readFileSync(resolve(process.cwd(), QUIZ_EDITOR), "utf8");
}

describe("M-R29: QuizEditor question/option text inputs use real <label>, not aria-label override (WCAG 3.3.2 / 4.1.2)", () => {
  describe("question text input", () => {
    it("does NOT carry `aria-label={`Question ${...} text`}` on the input element", () => {
      const src = readQuizEditor();
      // The input element is rendered with `id={`q-${qIndex}-text`}`. The
      // interim fix shipped `aria-label={`Question ${qIndex + 1} text`}` on
      // that input. Round 29 removes the aria-label so the real <label>
      // becomes the canonical accessible name source.
      // Pattern matches the input line itself (with type="text" on the same
      // line) followed by the aria-label attribute.
      const inputBlockRe = /<input\s+id=\{`q-\$\{qIndex\}-text`\}[\s\S]*?\/>/;
      const inputBlock = src.match(inputBlockRe)?.[0] ?? "";
      expect(inputBlock).not.toMatch(/aria-label=\{`Question\s/);
    });

    it("has a matching <label htmlFor={`q-${qIndex}-text`} className=\"sr-only\">", () => {
      const src = readQuizEditor();
      // The sr-only label carries the field's accessible name: "Question N text".
      const re = /<label\s+htmlFor=\{`q-\$\{qIndex\}-text`\}\s+className="sr-only">\s+Question\s+\{qIndex\s*\+\s*1\}\s+text\s+<\/label>/;
      expect(src).toMatch(re);
    });

    it("the visible Q{n} badge is a <label aria-hidden> so it stays as a row marker without competing for the AT announcement", () => {
      const src = readQuizEditor();
      const re = /<label\s+htmlFor=\{`q-\$\{qIndex\}-text`\}\s+className=\{styles\.questionLabel\}\s+aria-hidden>/;
      expect(src).toMatch(re);
    });
  });

  describe("option text input", () => {
    it("does NOT carry `aria-label={`Option ${...} text`}` on the input element", () => {
      const src = readQuizEditor();
      const inputBlockRe = /<input\s+id=\{`q-\$\{qIndex\}-opt-\$\{oIndex\}-text`\}[\s\S]*?\/>/;
      const inputBlock = src.match(inputBlockRe)?.[0] ?? "";
      expect(inputBlock).not.toMatch(/aria-label=\{`Option\s/);
    });

    it("has a matching <label htmlFor={`q-${qIndex}-opt-${oIndex}-text`} className=\"sr-only\">", () => {
      const src = readQuizEditor();
      const re = /<label\s+htmlFor=\{`q-\$\{qIndex\}-opt-\$\{oIndex\}-text`\}\s+className="sr-only">\s+Option\s+\{oIndex\s*\+\s*1\}\s+text\s+for\s+question\s+\{qIndex\s*\+\s*1\}\s+<\/label>/;
      expect(src).toMatch(re);
    });
  });

  describe("radio toggle for correct option", () => {
    it("keeps its `aria-label={`Mark option ${...} as correct for question ${...}`}` (no visible label to associate)", () => {
      const src = readQuizEditor();
      // The radio is a toggle with no visible text on the same row. aria-label
      // is the only label mechanism here, so it stays.
      const re = /aria-label=\{`Mark\s+option\s+\$\{oIndex\s*\+\s*1\}\s+as\s+correct\s+for\s+question\s+\$\{qIndex\s*\+\s*1\}`\}/;
      expect(src).toMatch(re);
    });
  });

  it("ships an M-R29 doc block citing WCAG 3.3.2 / 4.1.2", () => {
    const src = readQuizEditor();
    // The JSX comment block uses single-line `{/* ... */}` syntax which
    // spans multiple lines via `{/* ... \n ... */}`. Match `{/*` opener,
    // any content including newlines, then `*/}` closer (literal `*/}`
    // since the comment lives inside JSX).
    const blocks = src.match(/\{\/\*\s*M-R29 fix[\s\S]*?\*\/\}/g) ?? [];
    expect(blocks.length).toBeGreaterThanOrEqual(2); // one per affected input
    for (const block of blocks) {
      // Both citation tokens must appear in the same doc block; the form is
      // `WCAG 3.3.2 / 4.1.2.`, so `WCAG\s+3\.3\.2` catches the first number
      // and `4\.1\.2` catches the second (after the slash + space).
      expect(block).toMatch(/WCAG\s+3\.3\.2/);
      expect(block).toMatch(/4\.1\.2/);
    }
  });
});