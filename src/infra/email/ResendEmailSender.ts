/**
 * ResendEmailSender — production adapter for EmailSender.
 *
 * STORY-045: EmailSender port + React Email templates.
 *
 * Wraps the Resend SDK (already in package.json) with our port's
 * Result-based contract. Resend accepts a React element directly, so
 * we pass `message.react` through without manual HTML rendering.
 *
 * Error handling:
 *  - Empty/whitespace to or subject → invalid_recipient / invalid_subject
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
  private readonly client: Resend;
  private readonly defaultFrom: string;

  constructor(apiKey: string, defaultFrom: string) {
    this.client = new Resend(apiKey);
    this.defaultFrom = defaultFrom;
  }

  async send(message: EmailMessage): Promise<Result<{ messageId: string }, EmailSenderError>> {
    // ── Validate ────────────────────────────────────────────
    if (!message.to.includes("@")) {
      return Result.err({ kind: "invalid_recipient" });
    }
    if (!message.subject.trim()) {
      return Result.err({ kind: "invalid_subject" });
    }

    // ── Send ────────────────────────────────────────────────
    try {
      const result = await this.client.emails.send({
        from: message.from ?? this.defaultFrom,
        to: message.to,
        subject: message.subject,
        react: message.react,
        text: message.text,
        attachments: message.attachments?.map((a) => ({
          filename: a.filename,
          content: a.content,
        })),
        tags: message.tags ? [...message.tags] : undefined,
      });

      if (result.error) {
        return Result.err({ kind: "send_error", message: result.error.message });
      }
      if (!result.data) {
        return Result.err({ kind: "send_error", message: "Resend returned no data" });
      }
      return Result.ok({ messageId: result.data.id });
    } catch (err: unknown) {
      return Result.err({
        kind: "send_error",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }
}
