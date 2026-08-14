/**
 * T4 — proxy.ts session revocation guard.
 *
 * C1 from docs/ULTRA-REVIEW-2026-08-14.md.
 *
 * The proxy must call sessionRepo.findById() after jwt.verify() to
 * reject revoked sessions immediately. A revoked-session user whose JWT
 * has not yet expired must be redirected to /login, not granted access.
 *
 * This test verifies the architectural requirement is met in source.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const PROXY_PATH = join(process.cwd(), "src/proxy.ts");
const PROXY_SOURCE = readFileSync(PROXY_PATH, "utf-8");

describe("T4 proxy session revocation guard", () => {
  it("calls jwt.verify before checking the sessions table", () => {
    const jwtVerifyIdx = PROXY_SOURCE.indexOf("jwt.verify(");
    const findByIdIdx = PROXY_SOURCE.indexOf("findById(");
    expect(jwtVerifyIdx).toBeGreaterThan(-1);
    expect(findByIdIdx).toBeGreaterThan(jwtVerifyIdx);
  });

  it("verifies the session row exists after JWT verification", () => {
    // The proxy must check sessionRepo.findById(sessionId) in the protected
    // route path, not just trust the JWT alone.
    expect(PROXY_SOURCE).toContain("sessionRepo.findById");
  });

  it("clears the session cookie when the session row is not found", () => {
    // If findById returns an error, the proxy must delete the cookie and
    // redirect, not pass the request through.
    const findByIdIdx = PROXY_SOURCE.indexOf("findById(");
    const cookieDeleteAfterFindById =
      PROXY_SOURCE.indexOf("cookies.delete", findByIdIdx) > findByIdIdx;
    expect(cookieDeleteAfterFindById).toBe(true);
  });

  it("redirects to login when the session is revoked", () => {
    // After deleting the cookie, the proxy must return a redirect to the
    // appropriate login page.
    const notOkIdx = PROXY_SOURCE.indexOf("!sessionResult.ok");
    const redirectAfterNotOk =
      PROXY_SOURCE.indexOf("NextResponse.redirect", notOkIdx) > notOkIdx;
    expect(redirectAfterNotOk).toBe(true);
  });
});
