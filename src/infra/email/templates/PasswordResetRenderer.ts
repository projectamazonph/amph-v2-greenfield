/**
 * Default PasswordResetRenderer — wraps the PasswordResetEmail
 * React Email template.
 *
 * Mirrors `EmailVerificationTemplateRenderer` (STORY-007).
 * STORY-008: this adapter lives in infra so the React Email
 * template (in the same folder) is reachable. The port
 * (`@/ports/email/PasswordResetRenderer`) is what the use case
 * depends on.
 */

import type { ReactElement } from "react";
import type { PasswordResetRenderer as IPasswordResetRenderer } from "@/ports/email/PasswordResetRenderer";
import type { EmailTemplateOverride } from "@/ports/email/EmailTemplateOverride";
import { PasswordResetEmail } from "./PasswordResetEmail";

// Re-export under the port name so consumers that already have a
// `PasswordResetRenderer` import from `@/ports/email` don't get
// confused. The infra-side class is the implementation.
export type { PasswordResetRenderer as IPasswordResetRenderer } from "@/ports/email/PasswordResetRenderer";

export class PasswordResetTemplateRenderer implements IPasswordResetRenderer {
  render(
    args: { firstName: string; resetUrl: string; expiresInMinutes: number } & EmailTemplateOverride,
  ): ReactElement {
    return PasswordResetEmail(args);
  }
}
