# STORY-045 — EmailSender Port + React Email Templates

## Status

- **Story**: STORY-045
- **Sprint**: 9 — Certificates + Email
- **Points**: 1
  **Status:** Done (commit 9e5eb11)

## Overview

Lay the foundation for every transactional email in the app. After this
story, any use case can send a templated email by calling
`container.emailSender.send({...})` — without knowing whether the
adapter is Resend, SendGrid, or a console-logging fake.

**Scope of this story:**

- `EmailSender` port (typed `EmailMessage` in, `Result<{messageId}, error>` out)
- `ResendEmailSender` production adapter (uses the `resend` SDK already in `package.json`)
- `InMemoryEmailSender` test fake (records sent messages for assertions)
- **6 React Email templates** built with `@react-email/components`:
  - `ReceiptEmail` — order paid
  - `CertificateEmail` — cert issued
  - `RefundEmail` — refund processed
  - `EmailVerificationEmail` — sign-up verification link
  - `PasswordResetEmail` — password reset link
  - `LiveClassReminderEmail` — class starting soon
- Container wiring (prod uses Resend, test uses InMemory)
- Tests:
  - Port contract tests (Resend + InMemory both satisfy the contract)
  - Template render tests (each template renders to expected text content)

**Out of scope (deferred):**

- **Actually wiring each template to its triggering use case.** That's
  a lot of separate work. After 045 lands, individual use cases
  (SignUp, PasswordReset, RecordQuizAttempt → cert, refund processor
  in 049, etc.) get follow-up PRs to call the email sender. This
  story makes the email infra exist; future stories plug it in.
- Email analytics (open/click tracking) — separate story
- Email templates for live class post-session recap — separate
- Custom domain DKIM/SPF setup — production concern
- Resend webhook handling (bounce/complaint) — separate
- Email preference / unsubscribe — separate (compliance story)

## 1. Port

```typescript
// src/ports/email/EmailSender.ts

export interface EmailAttachment {
  filename: string;
  content: Buffer;
  contentType: string; // e.g. "application/pdf"
}

export interface EmailMessage {
  to: string; // recipient email
  from?: string; // override default sender
  subject: string;
  /** React element rendered server-side by the adapter. */
  react: React.ReactElement;
  text?: string; // optional plain-text fallback
  attachments?: readonly EmailAttachment[];
  tags?: readonly { name: string; value: string }[];
}

export type EmailSenderError =
  | { kind: "invalid_recipient" }
  | { kind: "invalid_subject" }
  | { kind: "send_error"; message: string };

export interface EmailSender {
  /**
   * Send a transactional email. Returns the provider's message ID
   * on success. Errors are mapped to a typed Result — the caller can
   * decide whether to retry, log, or alert.
   *
   * The `react` field is rendered by the adapter. We pass a React
   * element (not pre-rendered HTML) so the adapter is free to choose
   * how to render — Resend's SDK accepts a React element directly.
   */
  send(message: EmailMessage): Promise<Result<{ messageId: string }, EmailSenderError>>;
}
```

**Why React element, not pre-rendered HTML?** Resend accepts both, but
passing a React element keeps the rendering concern at the adapter
boundary. The domain/usecase code constructs the element; the adapter
is responsible for converting it to whatever the provider needs.

**Why a port at all?** The same reason as every other port in this
codebase: testability (fake the email in unit tests), swappability
(SendGrid → Resend → console-log for dev), and SOLID boundaries. The
template logic is in the React components; the I/O is in the adapter.

## 2. Adapters

### Production: `ResendEmailSender`

```typescript
// src/infra/email/ResendEmailSender.ts
import { Resend } from "resend";
import { renderToStaticMarkup } from "react-dom/server";
import type { EmailSender, EmailMessage, EmailSenderError } from "@/ports/email/EmailSender";

export class ResendEmailSender implements EmailSender {
  private client: Resend;
  private defaultFrom: string;

  constructor(apiKey: string, defaultFrom: string) {
    this.client = new Resend(apiKey);
    this.defaultFrom = defaultFrom;
  }

  async send(message: EmailMessage): Promise<Result<{ messageId: string }, EmailSenderError>> {
    // Validate
    if (!message.to.includes("@")) return Result.err({ kind: "invalid_recipient" });
    if (!message.subject.trim()) return Result.err({ kind: "invalid_subject" });

    try {
      const html = renderToStaticMarkup(message.react);
      const result = await this.client.emails.send({
        from: message.from ?? this.defaultFrom,
        to: message.to,
        subject: message.subject,
        html,
        text: message.text,
        attachments: message.attachments?.map((a) => ({
          filename: a.filename,
          content: a.content,
        })),
        tags: message.tags
          ? Object.fromEntries(message.tags.map((t) => [t.name, t.value]))
          : undefined,
      });
      if (result.error) {
        return Result.err({ kind: "send_error", message: result.error.message });
      }
      return Result.ok({ messageId: result.data?.id ?? "unknown" });
    } catch (err) {
      return Result.err({ kind: "send_error", message: String(err) });
    }
  }
}
```

### Test: `InMemoryEmailSender`

```typescript
// src/infra/email/InMemoryEmailSender.ts
export interface SentEmail {
  to: string;
  from: string;
  subject: string;
  html: string;
  text?: string;
  attachments: readonly EmailAttachment[];
  tags: readonly { name: string; value: string }[];
  sentAt: Date;
}

export class InMemoryEmailSender implements EmailSender {
  public readonly sent: SentEmail[] = [];
  private nextMessageId = 1;

  async send(message: EmailMessage): Promise<Result<{ messageId: string }, EmailSenderError>> {
    if (!message.to.includes("@")) return Result.err({ kind: "invalid_recipient" });
    if (!message.subject.trim()) return Result.err({ kind: "invalid_subject" });
    const messageId = `msg_${this.nextMessageId++}`;
    this.sent.push({
      to: message.to,
      from: message.from ?? "noreply@amph.example.com",
      subject: message.subject,
      html: renderToStaticMarkup(message.react),
      text: message.text,
      attachments: message.attachments ?? [],
      tags: message.tags ?? [],
      sentAt: new Date(),
    });
    return Result.ok({ messageId });
  }
}
```

## 3. Templates

All 6 templates live in `src/infra/email/templates/`. Each is a
React component that takes a typed props interface.

The shared shell (`EmailLayout`) provides consistent header/footer,
the Project Amazon PH Academy brand, and a center column.

### 3.1 `ReceiptEmail`

```typescript
export interface ReceiptEmailProps {
  firstName: string;
  orderNumber: string; // e.g. "AMPH-2026-000123"
  courseTitle: string;
  amountMinor: number;
  currency: string; // "PHP"
  paidAt: Date;
  receiptUrl: string; // full URL to the receipt page
}
```

### 3.2 `CertificateEmail`

```typescript
export interface CertificateEmailProps {
  firstName: string;
  courseTitle: string;
  verificationHash: string;
  verifyUrl: string; // e.g. https://amph.example.com/certificates/{hash}
  pdfBuffer: Buffer; // attached as application/pdf
}
```

The certificate PDF is attached (per STORY-042's design — the PDF
is a historical artifact and belongs in the email).

### 3.3 `RefundEmail`

```typescript
export interface RefundEmailProps {
  firstName: string;
  orderNumber: string;
  courseTitle: string;
  amountMinor: number;
  currency: string;
  refundedAt: Date;
  reason: string;
}
```

### 3.4 `EmailVerificationEmail`

```typescript
export interface EmailVerificationEmailProps {
  firstName: string;
  verificationUrl: string; // includes token
  expiresInHours: number;
}
```

### 3.5 `PasswordResetEmail`

```typescript
export interface PasswordResetEmailProps {
  firstName: string;
  resetUrl: string; // includes token
  expiresInMinutes: number;
}
```

### 3.6 `LiveClassReminderEmail`

```typescript
export interface LiveClassReminderEmailProps {
  firstName: string;
  classTitle: string;
  startsAt: Date; // local time, formatted in template
  joinUrl: string;
  minutesUntilStart: number; // 60, 30, 15, etc.
}
```

## 4. Container Wiring

```typescript
// In AppContainer:
emailSender: EmailSender;
```

- **prod:** `new ResendEmailSender(process.env.RESEND_API_KEY, "Project Amazon PH Academy <noreply@amph.example.com>")`
- **test:** `new InMemoryEmailSender()`

Both expose `emailSender` on the container.

## 5. Tests

### Port contract tests

Run the same test suite against both adapters to prove they both
satisfy the `EmailSender` contract. Pattern:

- sends successfully
- returns invalid_recipient for bad email
- returns invalid_subject for empty subject
- propagates send_error from the provider

### Template render tests

For each template, render with vitest, run through
`renderToStaticMarkup`, and assert the output contains the expected
strings (recipient name, order number, etc.). This is a smoke test
that the template doesn't crash and includes the key info.

### Wiring test

`buildTestContainer()` exposes `emailSender` and it's an
`InMemoryEmailSender` (so tests can assert against `.sent`).

## 6. Files

| File                                                        | Change                        |
| ----------------------------------------------------------- | ----------------------------- |
| `docs/stories/STORY-045.md`                                 | New — this doc                |
| `package.json`                                              | Add `@react-email/components` |
| `src/ports/email/EmailSender.ts`                            | New — port                    |
| `src/infra/email/ResendEmailSender.ts`                      | New — prod adapter            |
| `src/infra/email/InMemoryEmailSender.ts`                    | New — test fake               |
| `src/infra/email/templates/EmailLayout.tsx`                 | New — shared shell            |
| `src/infra/email/templates/ReceiptEmail.tsx`                | New                           |
| `src/infra/email/templates/CertificateEmail.tsx`            | New                           |
| `src/infra/email/templates/RefundEmail.tsx`                 | New                           |
| `src/infra/email/templates/EmailVerificationEmail.tsx`      | New                           |
| `src/infra/email/templates/PasswordResetEmail.tsx`          | New                           |
| `src/infra/email/templates/LiveClassReminderEmail.tsx`      | New                           |
| `src/composition/container.ts`                              | Wire `emailSender`            |
| `tests/unit/email/InMemoryEmailSender.test.ts`              | New — port contract           |
| `tests/unit/email/ResendEmailSender.test.ts`                | New — port contract           |
| `tests/unit/email/templates/ReceiptEmail.test.ts`           | New — render test             |
| `tests/unit/email/templates/CertificateEmail.test.ts`       | New — render test             |
| `tests/unit/email/templates/RefundEmail.test.ts`            | New — render test             |
| `tests/unit/email/templates/EmailVerificationEmail.test.ts` | New — render test             |
| `tests/unit/email/templates/PasswordResetEmail.test.ts`     | New — render test             |
| `tests/unit/email/templates/LiveClassReminderEmail.test.ts` | New — render test             |
| `tests/unit/composition/container.test.ts`                  | Add wiring test               |

## 7. Design Decisions

- **Port returns `Result`, not throws** — consistent with every other
  port in the codebase. The adapter catches Resend SDK errors and
  maps them to `send_error`.
- **`react: ReactElement` instead of `html: string`** — keeps the
  rendering concern at the adapter boundary. The domain/usecase code
  composes React; the adapter renders to the provider's format.
- **Plain text fallback is optional** — modern email clients prefer
  HTML; we can add plain text in a follow-up if needed. Resend
  generates a text version automatically if you don't provide one.
- **No email is actually wired to a use case yet** — this story
  ships the infrastructure. Each future use case that needs to send
  an email will get its own follow-up PR.
- **No React Email preview server in dev** — that's a `@react-email/preview`
  setup, deferrable. Dev can call `InMemoryEmailSender` (which is
  what the test container uses) and inspect the `.sent` array.
- **Shared `EmailLayout` template** — consistent header/footer/brand
  across all 6 emails. Project Amazon PH Academy navy + accent orange, matching the
  certificate design.
- **Validation is the adapter's job** — `invalid_recipient` and
  `invalid_subject` are caught before calling the provider. This
  keeps the use cases simple (they just call `emailSender.send(...)`).
