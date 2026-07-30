/**
 * Default PasswordChangedRenderer — wraps the PasswordChangedEmail React
 * Email template.
 *
 * Mirrors `PasswordResetTemplateRenderer`.
 */

import type { ReactElement } from "react";
import type { PasswordChangedRenderer as IPasswordChangedRenderer } from "@/ports/email/PasswordChangedRenderer";
import { PasswordChangedEmail } from "./PasswordChangedEmail";

export class PasswordChangedTemplateRenderer implements IPasswordChangedRenderer {
  render(args: { firstName: string; changedAt: Date }): ReactElement {
    return PasswordChangedEmail(args);
  }
}
