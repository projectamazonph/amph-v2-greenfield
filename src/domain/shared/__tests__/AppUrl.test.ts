/**
 * Unit tests for buildAppUrl.
 *
 * Critical: covers the "Forgot password" env-var hardening.
 * If `NEXT_PUBLIC_APP_URL` is set WITHOUT a scheme, the helper
 * must default to https:// (or http:// for localhost) so the
 * resulting URL is absolute, not relative.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { buildAppUrl } from "@/domain/shared/AppUrl";

const ORIGINAL_ENV = process.env["NEXT_PUBLIC_APP_URL"];

beforeEach(() => {
  delete process.env["NEXT_PUBLIC_APP_URL"];
});
afterEach(() => {
  if (ORIGINAL_ENV === undefined) {
    delete process.env["NEXT_PUBLIC_APP_URL"];
  } else {
    process.env["NEXT_PUBLIC_APP_URL"] = ORIGINAL_ENV;
  }
});

describe("buildAppUrl", () => {
  it("replaces the retired Vercel hostname with the live Academy hostname", () => {
    process.env["NEXT_PUBLIC_APP_URL"] = "amph-v2-greenfield.vercel.app";
    const url = buildAppUrl("/reset-password/abc");
    expect(url).toBe("https://projectamazonph.vercel.app/reset-password/abc");
  });

  it("defaults to http://localhost:3000 when the env var is unset", () => {
    const url = buildAppUrl("/login");
    expect(url).toBe("http://localhost:3000/login");
  });

  it("uses http:// when localhost is set without a scheme (dev-friendly)", () => {
    process.env["NEXT_PUBLIC_APP_URL"] = "localhost:3000";
    const url = buildAppUrl("/verify-email?token=xyz");
    expect(url).toBe("http://localhost:3000/verify-email?token=xyz");
  });

  it("uses http:// when 127.0.0.1 is set without a scheme", () => {
    process.env["NEXT_PUBLIC_APP_URL"] = "127.0.0.1:3000";
    const url = buildAppUrl("/verify-email?token=xyz");
    expect(url).toBe("http://127.0.0.1:3000/verify-email?token=xyz");
  });

  it("replaces the retired hostname when it includes an https scheme", () => {
    process.env["NEXT_PUBLIC_APP_URL"] = "https://amph-v2-greenfield.vercel.app";
    const url = buildAppUrl("/reset-password/abc");
    expect(url).toBe("https://projectamazonph.vercel.app/reset-password/abc");
  });

  it("preserves an explicit http:// scheme", () => {
    process.env["NEXT_PUBLIC_APP_URL"] = "http://staging.example.com";
    const url = buildAppUrl("/foo");
    expect(url).toBe("http://staging.example.com/foo");
  });

  it("trims trailing slashes from the base URL", () => {
    process.env["NEXT_PUBLIC_APP_URL"] = "https://example.com/";
    const url = buildAppUrl("/path");
    expect(url).toBe("https://example.com/path");
  });

  it("adds a leading slash to the path if missing", () => {
    process.env["NEXT_PUBLIC_APP_URL"] = "https://example.com";
    expect(buildAppUrl("path")).toBe("https://example.com/path");
    expect(buildAppUrl("/path")).toBe("https://example.com/path");
  });

  it("preserves query strings and hashes", () => {
    process.env["NEXT_PUBLIC_APP_URL"] = "https://example.com";
    const url = buildAppUrl("/verify-email?token=abc&next=/dashboard#top");
    expect(url).toBe("https://example.com/verify-email?token=abc&next=/dashboard#top");
  });
});
