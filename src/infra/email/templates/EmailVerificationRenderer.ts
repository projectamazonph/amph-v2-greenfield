/**
 * Default EmailVerificationRenderer — wraps the EmailVerificationEmail
 * React Email template.
 *
 * STORY-007: this adapter lives in infra so the React Email
 * template (in the same folder) is reachable. The port
 * (`@/ports/email/EmailVerificationRenderer`) is what the use
 * case depends on.
 */

import type { ReactElement } from "react";
import type { EmailVerificationRenderer } from "@/ports/email/EmailVerificationRenderer";
import { EmailVerificationEmail } from "./EmailVerificationEmail";

export class EmailVerificationTemplateRenderer
  implements EmailVerificationRenderer
{
  render(args: {
    firstName: string;
    verificationUrl: string;
    expiresInHours: number;
  }): ReactElement {
    return EmailVerificationEmail(args);
  }
}
