/**
 * InMemoryEmailSender — test fake for EmailSender.
 *
 * STORY-045: EmailSender port + React Email templates.
 *
 * Records every "sent" message in a public `sent` array. Tests assert
 * against it ("exactly 1 email was sent to X with subject Y"). Renders
 * the React element to HTML so the .html field is inspectable.
 *
 * No external I/O. Safe to use in unit tests, storybook, or local dev.
 */

import { renderToStaticMarkup } from "react-dom/server";
import { Result } from "@/domain/shared/Result";
import type {
  EmailSender,
  EmailMessage,
  EmailSenderError,
  EmailAttachment,
  EmailTag,
} from "@/ports/email/EmailSender";

export interface SentEmail {
  readonly to: string;
  readonly from: string;
  readonly subject: string;
  readonly html: string;
  readonly text: string | undefined;
  readonly attachments: readonly EmailAttachment[];
  readonly tags: readonly EmailTag[];
  readonly sentAt: Date;
}

const DEFAULT_FROM = "Project Amazon PH Academy <noreply@amph.example.com>";

export class InMemoryEmailSender implements EmailSender {
  public readonly sent: SentEmail[] = [];
  private nextMessageId = 1;

  async send(message: EmailMessage): Promise<Result<{ messageId: string }, EmailSenderError>> {
    // Same validation the real adapter does — so tests catch bad input early
    if (!message.to.includes("@")) {
      return Result.err({ kind: "invalid_recipient" });
    }
    if (!message.subject.trim()) {
      return Result.err({ kind: "invalid_subject" });
    }

    const messageId = `msg_${this.nextMessageId++}`;
    const html = renderToStaticMarkup(message.react);
    this.sent.push({
      to: message.to,
      from: message.from ?? DEFAULT_FROM,
      subject: message.subject,
      html,
      text: message.text,
      attachments: message.attachments ?? [],
      tags: message.tags ?? [],
      sentAt: new Date(),
    });
    return Result.ok({ messageId });
  }

  /** Reset the sent list. Useful in beforeEach. */
  clear(): void {
    this.sent.length = 0;
  }
}
