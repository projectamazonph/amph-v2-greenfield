import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = join(process.cwd(), "src");
const RUNTIME_TOKENS = new Set([
  "--font-display",
  "--font-body",
  "--font-cond",
  "--font-mono",
]);

function cssFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    return statSync(path).isDirectory() ? cssFiles(path) : path.endsWith(".css") ? [path] : [];
  });
}

function tsxFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    return statSync(path).isDirectory() ? tsxFiles(path) : path.endsWith(".tsx") ? [path] : [];
  });
}

function withoutComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, "");
}

function cssSources() {
  return cssFiles(SRC).map((file) => ({
    file,
    css: withoutComments(readFileSync(file, "utf8")),
  }));
}

function isLightStudentSurface(file: string): boolean {
  const path = relative(process.cwd(), file);
  return (
    (path.startsWith("src/app/") && !path.startsWith("src/app/admin/")) ||
    ["auth", "courses", "student", "tools", "ui"].some((area) =>
      path.startsWith(`src/components/${area}/`),
    )
  );
}

describe("design token contract", () => {
  it("only references declared or runtime-provided CSS custom properties", () => {
    const sources = cssSources();
    const references = [
      ...sources,
      ...tsxFiles(SRC)
        .filter(isLightStudentSurface)
        .map((file) => ({ file, css: readFileSync(file, "utf8") })),
    ];
    const declared = new Set(
      sources.flatMap(({ css }) =>
        Array.from(css.matchAll(/(^|[;{]\s*)(--[\w-]+)\s*:/gm), (match) => match[2]!),
      ),
    );
    const violations = references.flatMap(({ file, css }) =>
      Array.from(css.matchAll(/var\(\s*(--[\w-]+)/g), (match) => match[1]!)
        .filter((token) => !declared.has(token) && !RUNTIME_TOKENS.has(token))
        .map((token) => `${relative(process.cwd(), file)}: ${token}`),
    );

    expect(violations).toEqual([]);
  });

  it("uses the accessible ink token on accent backgrounds", () => {
    const violations = cssSources().flatMap(({ file, css }) =>
      css.split("}").flatMap((rule) => {
        const openBrace = rule.lastIndexOf("{");
        if (openBrace === -1) return [];

        const declaration = rule.slice(openBrace + 1);
        const hasAccentBackground = /(?:^|;)\s*background(?:-color)?\s*:\s*var\(--accent\)/m.test(
          declaration,
        );
        const hasLowContrastInk =
          /(?:^|;)\s*color\s*:\s*var\(--(?:ink-inverse|surface-[01])\)/m.test(declaration);

        return hasAccentBackground && hasLowContrastInk
          ? [`${relative(process.cwd(), file)}: ${declaration.trim()}`]
          : [];
      }),
    );

    expect(violations).toEqual([]);
  });

  it("uses the accessible accent text token on light student surfaces", () => {
    const cssViolations = cssSources()
      .filter(({ file }) => isLightStudentSurface(file))
      .flatMap(({ file, css }) =>
        Array.from(css.matchAll(/(^|[;{])\s*color\s*:\s*var\(--accent\)/gm), () =>
          relative(process.cwd(), file),
        ),
      );
    const tsxViolations = tsxFiles(SRC)
      .filter(isLightStudentSurface)
      .filter((file) => /color\s*:\s*["']var\(--accent\)["']/.test(readFileSync(file, "utf8")))
      .map((file) => relative(process.cwd(), file));

    expect([...cssViolations, ...tsxViolations]).toEqual([]);
  });
});
