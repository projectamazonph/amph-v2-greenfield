import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSessionUser: vi.fn(),
  buildContainer: vi.fn(),
  redirect: vi.fn((location: string): never => {
    throw new Error(`REDIRECT:${location}`);
  }),
  recordDownload: vi.fn(),
  verifyCertificate: vi.fn(),
  renderPdf: vi.fn(),
  verifyEmail: vi.fn(),
  container: {} as Record<string, unknown>,
}));

vi.mock("@/lib/auth", () => ({ getSessionUser: mocks.getSessionUser }));
vi.mock("@/composition/container", () => ({ buildContainer: mocks.buildContainer }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));

import { GET as downloadResource } from "../resources/[id]/download/route";
import { GET as downloadCertificate } from "../../certificates/[hash]/pdf/route";
import { POST as verifyEmailRoute } from "../../actions/verifyEmail/route";

const params = <T extends Record<string, string>>(value: T) => ({
  params: Promise.resolve(value),
});

beforeEach(() => {
  for (const mock of [
    mocks.getSessionUser,
    mocks.buildContainer,
    mocks.recordDownload,
    mocks.verifyCertificate,
    mocks.renderPdf,
    mocks.verifyEmail,
  ]) mock.mockReset();
  mocks.redirect.mockClear();
  mocks.container = {};
  mocks.buildContainer.mockImplementation(() => mocks.container);
});

describe("resource download route", () => {
  it("returns 401 before loading a resource without a session", async () => {
    mocks.getSessionUser.mockResolvedValue(null);
    const response = await downloadResource(
      new Request("https://academy.test"),
      params({ id: "resource-1" }),
    );
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: { kind: "unauthenticated" } });
    expect(mocks.buildContainer).not.toHaveBeenCalled();
  });

  it("records an allowed download and redirects to its file URL", async () => {
    mocks.getSessionUser.mockResolvedValue({ id: "student-1", subscriptionTier: "standard" });
    mocks.container = { recordResourceDownload: { execute: mocks.recordDownload } };
    mocks.recordDownload.mockResolvedValue({ ok: true, value: { fileUrl: "/downloads/guide.pdf" } });
    const response = await downloadResource(
      new Request("https://academy.test/api/resources/resource-1/download"),
      params({ id: "resource-1" }),
    );
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://academy.test/downloads/guide.pdf");
    expect(mocks.recordDownload).toHaveBeenCalledWith({
      resourceId: "resource-1",
      userId: "student-1",
      subscriptionTier: "standard",
    });
  });

  it("maps resource failures to HTTP statuses", async () => {
    mocks.getSessionUser.mockResolvedValue({ id: "student-1", subscriptionTier: "free" });
    mocks.container = { recordResourceDownload: { execute: mocks.recordDownload } };
    for (const [kind, status] of [
      ["not_found", 404],
      ["access_denied", 403],
      ["not_published", 403],
      ["db_error", 500],
    ] as const) {
      mocks.recordDownload.mockResolvedValueOnce({ ok: false, error: { kind } });
      const response = await downloadResource(
        new Request("https://academy.test"),
        params({ id: "resource-1" }),
      );
      expect(response.status).toBe(status);
      expect(await response.json()).toEqual({ error: { kind } });
    }
  });
});

describe("certificate PDF route", () => {
  it("returns 404 when a certificate hash is invalid", async () => {
    mocks.container = { verifyCertificate: { execute: mocks.verifyCertificate } };
    mocks.verifyCertificate.mockResolvedValue({
      ok: false,
      error: { kind: "invalid_hash_format" },
    });
    const response = await downloadCertificate(
      new Request("https://academy.test"),
      params({ hash: "bad" }),
    );
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      error: { kind: "invalid_hash_format", message: "Certificate not found" },
    });
  });

  it("streams a rendered PDF with stable headers", async () => {
    mocks.container = {
      verifyCertificate: { execute: mocks.verifyCertificate },
      renderCertificatePdf: { execute: mocks.renderPdf },
    };
    mocks.verifyCertificate.mockResolvedValue({
      ok: true,
      value: { certificate: { id: "certificate-1" } },
    });
    mocks.renderPdf.mockResolvedValue({
      ok: true,
      value: { buffer: Buffer.from("%PDF-test"), verificationHash: "abcdefgh1234" },
    });
    const response = await downloadCertificate(
      new Request("https://academy.test"),
      params({ hash: "hash-1" }),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(response.headers.get("content-disposition")).toBe(
      'inline; filename="certificate-abcdefgh.pdf"',
    );
    expect(await response.text()).toBe("%PDF-test");
    expect(mocks.renderPdf).toHaveBeenCalledWith({ certificateId: "certificate-1" });
  });

  it("maps data-integrity and rendering failures to 500 responses", async () => {
    mocks.container = {
      verifyCertificate: { execute: mocks.verifyCertificate },
      renderCertificatePdf: { execute: mocks.renderPdf },
    };
    mocks.verifyCertificate
      .mockResolvedValueOnce({ ok: false, error: { kind: "course_not_found" } })
      .mockResolvedValueOnce({ ok: true, value: { certificate: { id: "certificate-1" } } });
    mocks.renderPdf.mockResolvedValue({ ok: false, error: { kind: "render_error" } });
    const integrity = await downloadCertificate(
      new Request("https://academy.test"),
      params({ hash: "hash-1" }),
    );
    expect(integrity.status).toBe(500);
    const render = await downloadCertificate(
      new Request("https://academy.test"),
      params({ hash: "hash-1" }),
    );
    expect(render.status).toBe(500);
    expect(await render.json()).toEqual({
      error: { kind: "render_error", message: "Failed to render certificate" },
    });
  });
});

describe("verify-email route", () => {
  it("forwards the posted token to the server action", async () => {
    const verify = vi.fn().mockResolvedValue({ ok: true, value: undefined });
    mocks.container = { verifyEmail: { execute: verify } };
    const body = new FormData();
    body.set("token", "token-1");
    await expect(
      verifyEmailRoute(
        new Request("https://academy.test/actions/verifyEmail", {
          method: "POST",
          body,
        }) as unknown as NextRequest,
      ),
    ).rejects.toThrow("REDIRECT:/dashboard?welcome=1");
    expect(verify).toHaveBeenCalledWith({ token: "token-1" });
  });
});
