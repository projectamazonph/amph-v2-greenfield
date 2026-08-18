/**
 * Port Wiring Verification.
 *
 * Verifies that every port interface in src/ports/ is wired into the
 * production container (src/composition/container.ts).
 *
 * A port adapter can exist (file in src/infra/) without being wired
 * into buildContainer(). This test catches unwired ports before they
 * cause runtime failures.
 *
 * Known unwired ports that should be wired:
 *   - IEmailTemplateRepository (wired)
 *   - IProgressEventRepository (wired)
 *
 * Ports that are intentionally not wired (exempt):
 *   - Ports implemented inline in container (EmailTemplateRenderer, etc.)
 *
 * Strict mode: any unwired port = CI failure.
 */

import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const PORTS_ROOT = join(process.cwd(), "src", "ports");
const CONTAINER_PATH = join(process.cwd(), "src", "composition", "container.ts");

// Ports that are intentionally not wired (inline adapters, etc.)
// Add to this set with a comment explaining why.
const INTENTIONALLY_UNWIRED = new Set<string>([
  // Email template renderers are instantiated inline in container.ts
  // (EmailVerificationTemplateRenderer, LiveClassReminderTemplateRenderer, etc.)
  // They implement EmailTemplateRenderer port which is not exported as a separate type.
]);

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      walk(full, out);
    } else if (entry.endsWith(".ts") && !entry.endsWith(".test.ts")) {
      out.push(full);
    }
  }
  return out;
}

function extractPortNames(body: string): string[] {
  // Match port interfaces: export interface INameRepository { ... }
  const portRe = /export\s+interface\s+(\w+)/g;
  const names: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = portRe.exec(body)) !== null) {
    names.push(m[1] ?? "");
  }
  return names;
}

function extractWiredPorts(containerBody: string): Set<string> {
  const wired = new Set<string>();

  // Match import statements for port types:
  // import type { PortName } from "@/ports/...";
  // import type { PortName, AnotherPort } from "@/ports/...";
  const importRe = /import\s+type\s+\{([^}]+)\}\s+from\s+["']@\/ports[^"']+["']/g;
  let m: RegExpExecArray | null;
  while ((m = importRe.exec(containerBody)) !== null) {
    const imports = (m[1] ?? "").split(",").map((s) => s.trim());
    for (const name of imports) {
      wired.add(name);
    }
  }

  // Also check for import type Xxx from ".../IxxxRepository" pattern
  const namedImportRe = /import\s+type\s+(\w+)\s+from\s+["'][^"']*I\w+Repository[^"']*["']/g;
  while ((m = namedImportRe.exec(containerBody)) !== null) {
    wired.add(m[1] ?? "");
  }

  return wired;
}

describe("port wiring verification", () => {
  const portFiles = walk(PORTS_ROOT);
  const containerBody = readFileSync(CONTAINER_PATH, "utf8");
  const wiredPorts = extractWiredPorts(containerBody);

  it("discovers port files (sanity check)", () => {
    expect(portFiles.length).toBeGreaterThan(0);
  });

  it("container.ts exists (sanity check)", () => {
    expect(statSync(CONTAINER_PATH).isFile()).toBe(true);
  });

  it("all port interfaces are wired into the container", () => {
    const unwired: { file: string; port: string }[] = [];

    for (const file of portFiles) {
      const body = readFileSync(file, "utf8");
      const portNames = extractPortNames(body);

      for (const portName of portNames) {
        // Skip intentionally unwired ports
        if (INTENTIONALLY_UNWIRED.has(portName)) continue;

        // Skip value objects and non-repository ports that don't need wiring
        if (!portName.includes("Repository") &&
            !portName.includes("Gateway") &&
            !portName.includes("Sender") &&
            !portName.includes("Registry")) {
          continue;
        }

        if (!wiredPorts.has(portName)) {
          unwired.push({
            file: relative(process.cwd(), file),
            port: portName,
          });
        }
      }
    }

    if (unwired.length > 0) {
      const report = unwired
        .map((u) => `  - ${u.port} (${u.file})`)
        .join("\n");
      throw new Error(
        `Unwired ports found:\n\n${report}\n\n` +
          `Every port interface must be imported and wired into container.ts.\n` +
          `To fix: add the port to container.ts imports and wire it to an adapter.`,
      );
    }

    expect(unwired).toEqual([]);
  });
});
