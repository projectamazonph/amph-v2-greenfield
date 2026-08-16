import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const HERO_CSS = resolve(process.cwd(), "src/components/landing/Hero.module.css");

describe("landing hero mobile wrapping", () => {
  it("allows the highlighted headline to wrap inside the phone content rail", () => {
    const source = readFileSync(HERO_CSS, "utf8");

    expect(source).toMatch(
      /@media\s*\(max-width:\s*600px\)[\s\S]*?\.pen\s*\{[\s\S]*?white-space:\s*normal;/,
    );
  });
});
