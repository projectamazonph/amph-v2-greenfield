/**
 * ResendEmailSender — production adapter for EmailSender.
 *
 * STORY-045: EmailSender port + React Email templates.
 *
 * Wraps the Resend SDK (already in package.json) with our port's
 * Result-based contract. Resend accepts a React element directly, so
 * we pass `message.react` through without manual HTML rendering.
 *
 * Lazy initialization:
 *   The Resend SDK client is created on the first `send()` call,
 *   not in the constructor. This means an empty `apiKey` does NOT
 *   throw at module load — only at the moment of an actual send.
 *   Why this matters: the prod container instantiates
 *   ResendEmailSender at module load (along with every other
 *   adapter). If the constructor threw on empty apiKey, every
 *   `next build` would fail unless RESEND_API_KEY was set in CI.
 *   With lazy init, the build is decoupled from runtime config.
 *
 * Error handling:
 *  - Empty/whitespace to or subject → invalid_recipient / invalid_subject
 *  - Empty apiKey at send time → configuration_error
 *  - Resend SDK error → send_error
 *  - Unexpected throw → send_error
 */

import { Resend } from "resend";
import { Result } from "@/domain/shared/Result";
import type {
  EmailSender,
  EmailMessage,
  EmailSenderError,
} from "@/ports/email/EmailSender";

export class ResendEmailSender implements EmailSender {
  private readonly apiKey: string;
  private readonly defaultFrom: string;
  private client: Resend | null = null;

  constructor(apiKey: string, defaultFrom: string) {
    // Defensive: store the key but don't validate it here. The
    // Resend SDK throws on empty keys when `new Resend("")` is
    // called — by deferring that call, we let the build succeed
    // even when the key isn't set (which is normal in CI).
    this.apiKey = apiKey;
    this.defaultFrom = defaultFrom;
  }

  /**
   * Lazily construct the Resend client. Called on the first send().
   * Returns null if the apiKey is empty (caller checks).
   */
  private getClient(): Resend | null {
    if (this.client) return this.client;
    if (!this.apiKey) return null;
    this.client = new Resend(this.apiKey);
    return this.client;
  }

  async send(message: EmailMessage): Promise<Result<{ messageId: string }, EmailSenderError>> {
    // ── Validate ────────────────────────────────────────────
    if (!message.to.includes("@")) {
      return Result.err({ kind: "invalid_recipient" });
    }
    if (!message.subject.trim()) {
      return Result.err({ kind: "invalid_subject" });
    }

    // ── Lazy client init ─────────────────────────────────────
    const client = this.getClient();
    if (!client) {
      return Result.err({
        kind: "configuration_error",
        message: "RESEND_API_KEY is not set; cannot send email",
      });
    }

    // ── Send ──────────────────────────────────────────────────
    try {
      const response = await client.emails.send({
        from: message.from ?? this.defaultFrom,
        to: message.to,
        subject: message.subject,
        react: message.react,
        text: message.text,
        attachments: message.attachments?.map((a) => ({
          filename: a.filename,
          content: a.content,
        })),
        tags: message.tags?.map((t) => ({ name: t.name, value: t.value })),
      });

      if (response.error) {
        return Result.err({
          kind: "send_error",
          message: response.error.message ?? "Resend SDK returned an error",
        });
      }
      if (!response.data) {
        return Result.err({
          kind: "send_error",
          message: "Resend returned no data",
        });
      }
      return Result.ok({ messageId: response.data.id });
    } catch (err) {
      // Stringify any thrown value. The Resend SDK sometimes throws
      // non-Error values (e.g. plain strings) — we want the actual
      // value in the error message for debugging.
      const message = err instanceof Error ? err.message : String(err);
      return Result.err({
        kind: "send_error",
        message,
      });
    }
  }
}
