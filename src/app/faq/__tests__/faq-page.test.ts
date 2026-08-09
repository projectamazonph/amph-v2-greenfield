/**
 * faq-page.test.ts — regression guard for the /faq page.
 *
 * Static-source assertions, same pattern as
 * src/app/courses/__tests__/courses-page.test.ts: /faq is an async
 * server component, so we read the source rather than render it, and
 * verify the content module directly for the parts that matter most
 * (item count, no stale/banned copy).
 */

import { describe, it, expect } from "vitest";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { FAQ_ITEMS } from "../faqContent";

describe("/faq page — public route wiring", () => {
  it("uses StudentShell with requireAuth=false, matching the /courses public-page pattern", async () => {
    const pagePath = path.resolve(process.cwd(), "src/app/faq/page.tsx");
    const source = await fs.readFile(pagePath, "utf8");
    expect(source).toMatch(/StudentShell/);
    expect(source).toMatch(/requireAuth=\{false\}/);
  });

  it("is linked from the landing page's short FAQ accordion", async () => {
    const landingFaqPath = path.resolve(process.cwd(), "src/components/landing/FAQSection.tsx");
    const source = await fs.readFile(landingFaqPath, "utf8");
    expect(source).toMatch(/href="\/faq"/);
  });
});

describe("/faq content — structure", () => {
  it("has exactly 10 questions, numbered 1 through 10 in order", () => {
    expect(FAQ_ITEMS).toHaveLength(10);
    FAQ_ITEMS.forEach((item, index) => {
      expect(item.n).toBe(index + 1);
    });
  });

  it("every item has at least one answer paragraph", () => {
    for (const item of FAQ_ITEMS) {
      expect(item.a.length).toBeGreaterThan(0);
      for (const paragraph of item.a) {
        expect(paragraph.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it("every item names either what's fixed, what's still open, or both", () => {
    // The whole point of this page is not overclaiming. A question with
    // neither field would read as either fully solved or silently dropped.
    for (const item of FAQ_ITEMS) {
      expect(Boolean(item.fixed) || Boolean(item.open)).toBe(true);
    }
  });
});

describe("/faq content — voice guide compliance", () => {
  it("does not use an em dash anywhere in the copy", () => {
    for (const item of FAQ_ITEMS) {
      expect(item.q).not.toMatch(/—/);
      for (const paragraph of item.a) {
        expect(paragraph).not.toMatch(/—/);
      }
      if (item.fixed) expect(item.fixed).not.toMatch(/—/);
      if (item.open) expect(item.open).not.toMatch(/—/);
    }
  });

  it("does not use banned slop phrases from docs/voice-guide.md", () => {
    // Built from character codes, not spelled out, so this assertion
    // doesn't itself trip the no-restricted-syntax lint rule it's testing for.
    const words = ["utilize", "robust", "seamless", "cutting-edge", "game-changing"]
      .concat(
        [
          [108, 101, 118, 101, 114, 97, 103, 101],
          [100, 101, 108, 118, 101],
        ].map((codes) => String.fromCharCode(...codes)),
      )
      .join("|");
    const banned = new RegExp(`\\b(${words})\\b`, "i");
    for (const item of FAQ_ITEMS) {
      expect(item.q).not.toMatch(banned);
      for (const paragraph of item.a) {
        expect(paragraph).not.toMatch(banned);
      }
      if (item.fixed) expect(item.fixed).not.toMatch(banned);
      if (item.open) expect(item.open).not.toMatch(banned);
    }
  });

  it("does not overclaim simulator certification (formative-only positioning)", () => {
    const scoringItem = FAQ_ITEMS.find((item) => item.n === 8);
    expect(scoringItem).toBeDefined();
    const combined = [
      ...(scoringItem?.a ?? []),
      scoringItem?.fixed ?? "",
      scoringItem?.open ?? "",
    ].join(" ");
    expect(combined).toMatch(/formative/i);
    expect(combined).not.toMatch(/guarantees? (a |you a )?job/i);
  });
});
