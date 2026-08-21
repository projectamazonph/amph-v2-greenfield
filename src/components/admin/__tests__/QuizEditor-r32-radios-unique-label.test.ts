/**
 * Round 32 — C-02 contract pin: every QuizEditor "mark as correct" radio
 * carries a unique `aria-label` keyed to the option and the question.
 *
 * Audit bullet C-02 (docs/UI-ACCESSIBILITY-AUDIT-2026-08-14.md lines 55-60):
 *   "QuizEditor radio inputs share a single `aria-label`.
 *    Each option's 'mark as correct' radio input has `aria-label="Mark as
 *    correct answer"`. Four radios in the same group all announce the same
 *    name, so screen readers cannot distinguish them and the user cannot
 *    tell which option the toggle applies to.
 *    Fix: Replace with a visually hidden `<label>` (or `aria-label` like
 *    `Mark option {oIndex + 1} as correct`) keyed to the option."
 *
 * The C-02 fix replaced the shared `aria-label="Mark as correct answer"`
 * with an interpolated string that includes both `oIndex + 1` (which option
 * in the row) and `qIndex + 1` (which question in the editor) so screen
 * readers can distinguish every radio across every question.
 *
 * WCAG 1.3.1 *Info and Relationships*, WCAG 4.1.2 *Name, Role, Value*.
 *
 * Mirrors the source-string pattern from rounds 16-31.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const QUIZ_EDITOR = "src/components/admin/QuizEditor.tsx";

function readQuizEditor(): string {
  return readFileSync(resolve(process.cwd(), QUIZ_EDITOR), "utf8");
}

describe("M-R32: QuizEditor 'mark as correct' radios have unique aria-labels (WCAG 1.3.1 / 4.1.2)", () => {
  it("does NOT ship the shared `aria-label=\"Mark as correct answer\"` on any radio", () => {
    const src = readQuizEditor();
    // The original anti-pattern was a single static label on every radio.
    // The C-02 fix removed that string entirely.
    expect(src).not.toMatch(/aria-label=["']Mark as correct answer["']/);
  });

  it("every radio carries an interpolated aria-label that includes both `oIndex + 1` and `qIndex + 1`", () => {
    const src = readQuizEditor();
    // The C-02 fix uses a template literal that interpolates both indices,
    // so the radio's accessible name identifies the option AND the question.
    const re = /aria-label=\{`Mark\s+option\s+\$\{oIndex\s*\+\s*1\}\s+as\s+correct\s+for\s+question\s+\$\{qIndex\s*\+\s*1\}`\}/;
    expect(src).toMatch(re);
  });

  it("the radio input still pairs with the matching option-text label via the same `name` attribute (radio-group semantics intact)", () => {
    const src = readQuizEditor();
    // Sanity: radios are grouped by question via `name={`correct-${qIndex}`}`.
    const re = /name=\{`correct-\$\{qIndex\}`\}/;
    expect(src).toMatch(re);
    // And the radio's `id` is keyed to the question index and option index.
    const idRe = /id=\{`q-\$\{qIndex\}-opt-\$\{oIndex\}-correct`\}/;
    expect(src).toMatch(idRe);
  });

  it("ships a doc block citing WCAG 3.3.2 / 4.1.2 (the criteria applied by the C-02 fix)", () => {
    const src = readQuizEditor();
    // The C-02 fix cited WCAG 3.3.2 *Labels or Instructions* and 4.1.2
    // *Name, Role, Value*. Pin both to lock the contract.
    expect(src).toMatch(/WCAG\s+3\.3\.2/);
    expect(src).toMatch(/4\.1\.2/);
  });
});