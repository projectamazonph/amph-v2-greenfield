import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = join(process.cwd(), "src");
const RUNTIME_TOKENS = new Set(["--font-display", "--font-mono"]);

function cssFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    return statSync(path).isDirectory() ? cssFiles(path) : path.endsWith(".css") ? [path] : [];
  });
}

function withoutComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, "");
}

describe("design token contract", () => {
  it("only references declared or runtime-provided CSS custom properties", () => {
    const files = cssFiles(SRC);
    const sources = files.map((file) => ({
      file,
      css: withoutComments(readFileSync(file, "utf8")),
    }));
    const declared = new Set(
      sources.flatMap(({ css }) =>
        Array.from(css.matchAll(/(^|[;{]\s*)(--[\w-]+)\s*:/gm), (match) => match[2]!),
      ),
    );
    const violations = sources.flatMap(({ file, css }) =>
      Array.from(css.matchAll(/var\(\s*(--[\w-]+)/g), (match) => match[1]!)
        .filter((token) => !declared.has(token) && !RUNTIME_TOKENS.has(token))
        .map((token) => `${relative(process.cwd(), file)}: ${token}`),
    );

    expect(violations).toEqual([]);
  });
});
