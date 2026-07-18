/**
 * EmailSender port — the single abstraction for "send a transactional email".
 *
 * STORY-045: EmailSender port + React Email templates.
 *
 * Domain/usecase code that needs to send an email depends on this
 * interface. The production adapter is Resend; the test fake is in-memory.
 *
 * ADR-014: Every port method returns Result<T, E>. Never throws across
 * layer boundaries.
 *
 * Why React element instead of pre-rendered HTML?
 *   The adapter is free to choose how to render (Resend accepts a React
 *   element directly). The use-case code just composes a React element
 *   and the adapter does the rest. Keeps rendering concern at the boundary.
 */

import type { ReactElement } from "react";
import type { Result } from "@/domain/shared/Result";

// ── Types ──────────────────────────────────────────────────────────────────

export interface EmailAttachment {
  /** Filename as it appears in the email client (e.g. "certificate.pdf"). */
  readonly filename: string;
  /** Raw bytes. */
  readonly content: Buffer;
  /** MIME type, e.g. "application/pdf". */
  readonly contentType: string;
}

export interface EmailTag {
  readonly name: string;
  readonly value: string;
}

export interface EmailMessage {
  /** Recipient email address. */
  readonly to: string;
  /** Optional override for the default sender ("from" address). */
  readonly from?: string;
  readonly subject: string;
  /** React element rendered server-side by the adapter. */
  readonly react: ReactElement;
  /** Optional plain-text fallback for clients that don't render HTML. */
  readonly text?: string;
  readonly attachments?: readonly EmailAttachment[];
  /** Provider tags for analytics / filtering. */
  readonly tags?: readonly EmailTag[];
}

export type EmailSenderError =
  | { kind: "invalid_recipient" }
  | { kind: "invalid_subject" }
  | { kind: "send_error"; message: string };

// ── Port ───────────────────────────────────────────────────────────────────

export interface EmailSender {
  /**
   * Send a transactional email. Returns the provider's message ID on
   * success. Errors are mapped to a typed Result — the caller decides
   * whether to retry, log, or alert.
   *
   * Side effect: emits the email to the real provider (prod) or
   * appends to an in-memory list (test). Fire-and-forget is NOT the
   * contract — callers should `await` the result and handle errors.
   */
  send(message: EmailMessage): Promise<Result<{ messageId: string }, EmailSenderError>>;
}
