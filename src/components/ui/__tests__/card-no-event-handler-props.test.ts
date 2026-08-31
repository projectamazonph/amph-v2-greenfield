/**
 * L-03 fix (audit 2026-08-20, umbrella #404): Card is a server
 * component, but its prop type used to extend
 * `HTMLAttributes<HTMLDivElement>`, which exposed the full DOM
 * event-handler surface. Passing any of those to Card would crash
 * at runtime ("Event handlers cannot be passed to Client Component
 * props"). The fix narrows `CardProps` to a curated, server-safe
 * subset.
 *
 * This test pins the new contract:
 *
 *   1. The source no longer extends `HTMLAttributes<HTMLDivElement>`.
 *   2. The source no longer spreads `...rest` to the rendered <div>
 *      (spreading was the silent path that let event handlers slip
 *      through to runtime).
 *   3. The interface explicitly accepts only safe props: `id`,
 *      `className`, `style`, `role`, `aria-*`, and `data-*`.
 *   4. The interface explicitly does NOT declare any of the React
 *      event-handler keys.
 *   5. The compile-time check: a programmatic tsc invocation
 *      against the rejection fixture must produce a type error
 *      mentioning `onClick`. If a future contributor re-broadens
 *      the prop type, this test fails loudly.
 *
 * Mirrors the source-string pin pattern from rounds 16-34.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const CARD = "src/components/ui/Card.tsx";
const FIXTURE = "src/components/ui/__tests__/card-event-handler-rejection.fixture.tsx";

function readCard(): string {
  return readFileSync(resolve(process.cwd(), CARD), "utf8");
}

function readFixture(): string {
  return readFileSync(resolve(process.cwd(), FIXTURE), "utf8");
}

/**
 * Programmatically run tsc on the rejection fixture and capture the
 * output. We use a one-off tsconfig that only includes the fixture
 * plus Card itself, so the gate is targeted and doesn't try to
 * typecheck the whole project. The tsconfig is written to a temp
 * file in `node_modules/.cache` so tsc accepts the `paths` option
 * (which is not allowed on the command line).
 *
 * Returns the combined stdout+stderr of tsc. The exit code is
 * non-zero when tsc finds a type error, which is exactly what we
 * want for the rejection fixture.
 */
function tscOnFixture(): { ok: boolean; output: string } {
  const fs = require("node:fs") as typeof import("node:fs");
  const os = require("node:os") as typeof import("node:os");
  const path = require("node:path") as typeof import("node:path");
  const projectRoot = process.cwd();
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "amph-tsc-"));
  const tsconfig = path.join(tmp, "tsconfig.json");
  const cardAbs = path.resolve(projectRoot, "src/components/ui/Card.tsx");
  const fixtureAbs = path.resolve(
    projectRoot,
    "src/components/ui/__tests__/card-event-handler-rejection.fixture.tsx",
  );
  fs.writeFileSync(
    tsconfig,
    JSON.stringify({
      compilerOptions: {
        target: "ES2022",
        lib: ["dom", "dom.iterable", "esnext"],
        module: "esnext",
        moduleResolution: "bundler",
        jsx: "react-jsx",
        strict: true,
        noUncheckedIndexedAccess: true,
        esModuleInterop: true,
        skipLibCheck: true,
        noEmit: true,
        isolatedModules: true,
        baseUrl: projectRoot,
        paths: { "@/*": ["./src/*"] },
      },
      include: [cardAbs, fixtureAbs],
    }),
  );

  // Use node + the tsc JS entry instead of `npx tsc` — `npx` resolution
  // can swallow stderr on Windows when the binary is a shell wrapper.
  const tscEntry = path.resolve(projectRoot, "node_modules", "typescript", "lib", "tsc.js");
  const result = spawnSync(process.execPath, [tscEntry, "--noEmit", "-p", tsconfig], {
    cwd: projectRoot,
    encoding: "utf8",
  });
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  // Clean up the temp directory.
  try {
    fs.rmSync(tmp, { recursive: true, force: true });
  } catch {
    // best-effort
  }
  return { ok: result.status === 0, output };
}

describe("L-03: Card is a server component and must reject event-handler props at compile time", () => {
  describe("source-string pin: Card.tsx no longer extends HTMLAttributes", () => {
    it("does NOT extend HTMLAttributes<HTMLDivElement>", () => {
      const src = readCard();
      expect(src).not.toMatch(/extends\s+HTMLAttributes<HTMLDivElement>/);
    });

    it("does NOT spread `{...rest}` to the rendered <div> (the silent runtime hole)", () => {
      // Pre-L-03, Card spread `{...rest}` to the underlying <div>,
      // which let every inherited HTMLAttributes prop reach the DOM.
      // With the narrowed prop type that's now safe, but the
      // `{...rest}` itself is a tripwire if someone later re-broadens
      // the interface without auditing the spread. Pin its absence.
      const src = readCard();
      expect(src).not.toMatch(/\{\.\.\.rest\}/);
    });

    it("documents the L-03 fix in the file header", () => {
      const src = readCard();
      expect(src).toMatch(/L-03 fix/);
    });
  });

  describe("source-string pin: CardProps declares only safe props", () => {
    it("accepts the curated set: id, className, style, role, aria-*, data-*", () => {
      const src = readCard();
      expect(src).toMatch(/id\?:\s*string/);
      expect(src).toMatch(/className\?:\s*string/);
      expect(src).toMatch(/style\?:\s*React\.CSSProperties/);
      expect(src).toMatch(/role\?:\s*AriaRole/);
      // The aria-* keys are quoted because they contain hyphens.
      expect(src).toMatch(/"aria-label"\?/);
      expect(src).toMatch(/"aria-labelledby"\?/);
      expect(src).toMatch(/"aria-describedby"\?/);
      expect(src).toMatch(/"aria-hidden"\?/);
      expect(src).toMatch(/"aria-live"\?/);
      // The data-* index signature uses a template literal type.
      expect(src).toMatch(/\[dataAttr:\s*`data-\$\{string\}`\]:/);
    });

    it("does NOT declare any of the React event-handler props", () => {
      const src = readCard();
      for (const handler of [
        "onClick",
        "onChange",
        "onSubmit",
        "onFocus",
        "onBlur",
        "onKeyDown",
        "onKeyUp",
        "onKeyPress",
        "onMouseDown",
        "onMouseUp",
        "onMouseEnter",
        "onMouseLeave",
        "onMouseOver",
        "onMouseOut",
        "onTouchStart",
        "onTouchEnd",
        "onTouchMove",
        "onPointerDown",
        "onPointerUp",
        "onPointerOver",
        "onPointerOut",
        "onContextMenu",
        "onDoubleClick",
        "onInput",
        "onAnimationStart",
        "onAnimationEnd",
        "onAnimationIteration",
        "onTransitionEnd",
      ]) {
        expect(src, `Card.tsx must not declare \`${handler}\``).not.toMatch(
          new RegExp(`\\b${handler}\\??:`),
        );
      }
    });
  });

  describe("compile-time pin: TS rejects <Card onClick={...} />", () => {
    it("rejection fixture file exists and exercises the bad prop", () => {
      expect(existsSync(resolve(process.cwd(), FIXTURE))).toBe(true);
      const fixture = readFixture();
      expect(fixture).toMatch(/<Card[^>]*\bonClick\s*=/);
    });

    it("programmatic tsc on the fixture reports a type error for onClick", () => {
      // This is the actual gate. If a future contributor re-broadens
      // CardProps, the tsc invocation below will succeed and this
      // test will fail.
      const { ok, output } = tscOnFixture();
      expect(ok, `tsc unexpectedly passed. Output:\n${output}`).toBe(false);
      expect(output, `tsc output must mention onClick. Output:\n${output}`).toMatch(/onClick/);
    });
  });
});
