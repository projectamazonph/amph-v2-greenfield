/**
 * ResendEmailSender port contract tests.
 *
 * STORY-045: EmailSender port + React Email templates.
 *
 * Mocks the Resend SDK so the tests don't hit the real API. Verifies
 * the adapter correctly translates port inputs to Resend's API and
 * translates Resend's response/error shapes into our typed Result.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { createElement } from "react";

// ── Hoisted mocks ──────────────────────────────────────────────────────────

const mocks = vi.hoisted(() => ({
  emailsSend: vi.fn(),
}));

vi.mock("resend", () => ({
  Resend: class {
    emails = { send: mocks.emailsSend };
    constructor(_key: string) {}
  },
}));

// ── Imports (must come after mocks) ───────────────────────────────────────

import { ResendEmailSender } from "@/infra/email/ResendEmailSender";

function makeMessage(overrides: Partial<Parameters<ResendEmailSender["send"]>[0]> = {}) {
  return {
    to: "user@example.com",
    subject: "Test subject",
    react: createElement("div", null, "Hello"),
    ...overrides,
  };
}

beforeEach(() => {
  mocks.emailsSend.mockReset();
  mocks.emailsSend.mockResolvedValue({
    data: { id: "resend_abc123" },
    error: null,
  });
});

describe("ResendEmailSender", () => {
  it("passes the to, subject, and react element to Resend", async () => {
    const sender = new ResendEmailSender("test_api_key", "Test <test@example.com>");
    const react = createElement("div", null, "Hello");
    await sender.send({ to: "alice@example.com", subject: "Hi", react });

    expect(mocks.emailsSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "alice@example.com",
        subject: "Hi",
        react,
      }),
    );
  });

  it("uses the default from when not specified", async () => {
    const sender = new ResendEmailSender("k", "Default <default@example.com>");
    await sender.send(makeMessage());

    expect(mocks.emailsSend).toHaveBeenCalledWith(
      expect.objectContaining({ from: "Default <default@example.com>" }),
    );
  });

  it("honors the from override", async () => {
    const sender = new ResendEmailSender("k", "Default <default@example.com>");
    await sender.send(makeMessage({ from: "Custom <custom@example.com>" }));

    expect(mocks.emailsSend).toHaveBeenCalledWith(
      expect.objectContaining({ from: "Custom <custom@example.com>" }),
    );
  });

  it("returns the Resend message id on success", async () => {
    const sender = new ResendEmailSender("k", "noreply@example.com");
    const result = await sender.send(makeMessage());

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.messageId).toBe("resend_abc123");
  });

  it("returns send_error when Resend returns an error", async () => {
    mocks.emailsSend.mockResolvedValueOnce({
      data: null,
      error: { message: "rate limit exceeded", name: "rate_limit_exceeded" },
    });
    const sender = new ResendEmailSender("k", "noreply@example.com");
    const result = await sender.send(makeMessage());

    expect(result).toEqual({
      ok: false,
      error: { kind: "send_error", message: "rate limit exceeded" },
    });
  });

  it("returns send_error when Resend returns neither data nor error", async () => {
    mocks.emailsSend.mockResolvedValueOnce({ data: null, error: null });
    const sender = new ResendEmailSender("k", "noreply@example.com");
    const result = await sender.send(makeMessage());

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("send_error");
    if (result.error.kind !== "send_error") return;
    expect(result.error.message).toBe("Resend returned no data");
  });

  it("catches thrown errors and maps them to send_error", async () => {
    mocks.emailsSend.mockRejectedValueOnce(new Error("network down"));
    const sender = new ResendEmailSender("k", "noreply@example.com");
    const result = await sender.send(makeMessage());

    expect(result).toEqual({
      ok: false,
      error: { kind: "send_error", message: "network down" },
    });
  });

  it("catches non-Error throws and stringifies them", async () => {
    mocks.emailsSend.mockRejectedValueOnce("string error");
    const sender = new ResendEmailSender("k", "noreply@example.com");
    const result = await sender.send(makeMessage());

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("send_error");
    if (result.error.kind !== "send_error") return;
    expect(result.error.message).toBe("string error");
  });

  it("returns invalid_recipient without calling Resend", async () => {
    const sender = new ResendEmailSender("k", "noreply@example.com");
    const result = await sender.send(makeMessage({ to: "no-at-sign" }));

    expect(result).toEqual({ ok: false, error: { kind: "invalid_recipient" } });
    expect(mocks.emailsSend).not.toHaveBeenCalled();
  });

  it("returns invalid_subject without calling Resend", async () => {
    const sender = new ResendEmailSender("k", "noreply@example.com");
    const result = await sender.send(makeMessage({ subject: "" }));

    expect(result).toEqual({ ok: false, error: { kind: "invalid_subject" } });
    expect(mocks.emailsSend).not.toHaveBeenCalled();
  });

  it("forwards tags and attachments to Resend", async () => {
    const sender = new ResendEmailSender("k", "noreply@example.com");
    await sender.send(
      makeMessage({
        tags: [{ name: "k", value: "v" }],
        attachments: [
          { filename: "a.pdf", content: Buffer.from("x"), contentType: "application/pdf" },
        ],
      }),
    );

    const call = mocks.emailsSend.mock.calls[0]![0];
    expect(call.tags).toEqual([{ name: "k", value: "v" }]);
    expect(call.attachments).toHaveLength(1);
    expect(call.attachments[0].filename).toBe("a.pdf");
  });

  // ── Lazy init: the Resend SDK should only be touched on send() ──

  it("does NOT throw in the constructor when apiKey is empty (lazy init)", () => {
    // The previous implementation called `new Resend("")` in the
    // constructor, which throws because the Resend SDK requires
    // a non-empty key. With lazy init, the constructor is safe
    // and only an actual send() reveals the missing key.
    expect(() => new ResendEmailSender("", "noreply@amph.example.com")).not.toThrow();
  });

  it("returns a configuration_error when send() is called with an empty apiKey", async () => {
    const sender = new ResendEmailSender("", "noreply@amph.example.com");
    const result = await sender.send(makeMessage());
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("configuration_error");
    // The Resend SDK was NOT called (we never even instantiated it)
    expect(mocks.emailsSend).not.toHaveBeenCalled();
  });
});
