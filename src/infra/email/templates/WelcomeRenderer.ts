/**
 * Default WelcomeRenderer — wraps the WelcomeEmail React Email template.
 *
 * Mirrors `EmailVerificationTemplateRenderer`.
 */

import type { ReactElement } from "react";
import type { WelcomeRenderer as IWelcomeRenderer } from "@/ports/email/WelcomeRenderer";
import { WelcomeEmail } from "./WelcomeEmail";

export class WelcomeTemplateRenderer implements IWelcomeRenderer {
  render(args: { firstName: string; dashboardUrl: string }): ReactElement {
    return WelcomeEmail(args);
  }
}
