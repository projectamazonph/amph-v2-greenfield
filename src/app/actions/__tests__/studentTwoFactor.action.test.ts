/**
 * studentTwoFactor.action.test.ts — STORY-097.
 *
 * The actual EnableTwoFactor/ConfirmTwoFactor/DisableTwoFactor logic is
 * already covered by twoFactor.action.test.ts (this file's wrappers
 * reuse those same perform* helpers unchanged). What's new here is the
 * student-facing redirect targets, which call Next's redirect() and are
 * exercised end-to-end rather than unit tested (matches twoFactor.action.test.ts's
 * own documented convention). This file pins the redirect targets via a
 * source-text assertion so a typo'd path (e.g. "/admin/settings" instead
 * of "/profile/security") fails CI instead of only being caught by
 * clicking through the UI.
 */

import { describe, it, expect } from "vitest";
import { readFile } from "node:fs/promises";
import path from "node:path";

const ACTION_PATH = path.join(process.cwd(), "src/app/actions/studentTwoFactor.action.ts");

describe("studentTwoFactor.action redirect targets", () => {
  it("never redirects to an admin-only route", async () => {
    const source = await readFile(ACTION_PATH, "utf8");
    expect(source).not.toMatch(/\/admin\/settings/);
  });

  it("redirects success and error paths to /profile/security", async () => {
    const source = await readFile(ACTION_PATH, "utf8");
    expect(source).toMatch(/redirect\(`\/profile\/security\?error=\$\{errorKind\(result\)\}`\)/);
    expect(source).toMatch(/redirect\("\/profile\/security\/2fa-setup"\)/);
    expect(source).toMatch(/redirect\("\/profile\/security\?2fa=enabled"\)/);
    expect(source).toMatch(/redirect\("\/profile\/security\?2fa=disabled"\)/);
  });

  it("re-uses the shared perform* helpers instead of duplicating use case calls", async () => {
    const source = await readFile(ACTION_PATH, "utf8");
    expect(source).toMatch(/performEnableTwoFactor/);
    expect(source).toMatch(/performConfirmTwoFactor/);
    expect(source).toMatch(/performDisableTwoFactor/);
    expect(source).toMatch(/from "@\/app\/actions\/twoFactor\.action"/);
  });
});
