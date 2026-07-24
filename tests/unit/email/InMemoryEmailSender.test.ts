/**
 * InMemoryEmailSender port contract tests.
 *
 * STORY-045: EmailSender port + React Email templates.
 */

import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { InMemoryEmailSender } from "@/infra/email/InMemoryEmailSender";

function makeMessage(overrides: Partial<Parameters<InMemoryEmailSender["send"]>[0]> = {}) {
  return {
    to: "user@example.com",
    subject: "Test subject",
    react: createElement("div", null, "Hello"),
    ...overrides,
  };
}

describe("InMemoryEmailSender", () => {
  it("returns a messageId on success", async () => {
    const sender = new InMemoryEmailSender();
    const result = await sender.send(makeMessage());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.messageId).toMatch(/^msg_\d+$/);
  });

  it("records the sent message", async () => {
    const sender = new InMemoryEmailSender();
    await sender.send(makeMessage({ to: "alice@example.com", subject: "Welcome" }));

    expect(sender.sent).toHaveLength(1);
    expect(sender.sent[0]!.to).toBe("alice@example.com");
    expect(sender.sent[0]!.subject).toBe("Welcome");
    expect(sender.sent[0]!.html).toContain("Hello");
  });

  it("uses the default from when not specified", async () => {
    const sender = new InMemoryEmailSender();
    await sender.send(makeMessage());
    expect(sender.sent[0]!.from).toBe("Project Amazon PH Academy <noreply@amph.example.com>");
  });

  it("honors the from override", async () => {
    const sender = new InMemoryEmailSender();
    await sender.send(makeMessage({ from: "Custom <custom@example.com>" }));
    expect(sender.sent[0]!.from).toBe("Custom <custom@example.com>");
  });

  it("assigns monotonically-increasing messageIds", async () => {
    const sender = new InMemoryEmailSender();
    const a = await sender.send(makeMessage());
    const b = await sender.send(makeMessage());
    const c = await sender.send(makeMessage());
    if (!a.ok || !b.ok || !c.ok) throw new Error("setup");
    expect(a.value.messageId).toBe("msg_1");
    expect(b.value.messageId).toBe("msg_2");
    expect(c.value.messageId).toBe("msg_3");
  });

  it("returns invalid_recipient for a to without @", async () => {
    const sender = new InMemoryEmailSender();
    const result = await sender.send(makeMessage({ to: "not-an-email" }));
    expect(result).toEqual({ ok: false, error: { kind: "invalid_recipient" } });
    expect(sender.sent).toHaveLength(0);
  });

  it("returns invalid_subject for an empty subject", async () => {
    const sender = new InMemoryEmailSender();
    const result = await sender.send(makeMessage({ subject: "" }));
    expect(result).toEqual({ ok: false, error: { kind: "invalid_subject" } });
    expect(sender.sent).toHaveLength(0);
  });

  it("returns invalid_subject for a whitespace-only subject", async () => {
    const sender = new InMemoryEmailSender();
    const result = await sender.send(makeMessage({ subject: "   " }));
    expect(result).toEqual({ ok: false, error: { kind: "invalid_subject" } });
  });

  it("records attachments when provided", async () => {
    const sender = new InMemoryEmailSender();
    const buf = Buffer.from("%PDF-1.4\nfake\n", "utf8");
    await sender.send(
      makeMessage({
        attachments: [{ filename: "cert.pdf", content: buf, contentType: "application/pdf" }],
      }),
    );
    expect(sender.sent[0]!.attachments).toHaveLength(1);
    expect(sender.sent[0]!.attachments[0]!.filename).toBe("cert.pdf");
  });

  it("records tags when provided", async () => {
    const sender = new InMemoryEmailSender();
    await sender.send(
      makeMessage({
        tags: [
          { name: "template", value: "receipt" },
          { name: "course_id", value: "course_01" },
        ],
      }),
    );
    expect(sender.sent[0]!.tags).toHaveLength(2);
    expect(sender.sent[0]!.tags[0]).toEqual({ name: "template", value: "receipt" });
  });

  it("clear() empties the sent list", async () => {
    const sender = new InMemoryEmailSender();
    await sender.send(makeMessage());
    await sender.send(makeMessage());
    expect(sender.sent).toHaveLength(2);
    sender.clear();
    expect(sender.sent).toHaveLength(0);
  });
});
