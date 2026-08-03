/**
 * Default WelcomeRenderer — wraps the WelcomeEmail React Email template.
 *
 * Mirrors `EmailVerificationTemplateRenderer`.
 */

import type { ReactElement } from "react";
import type { WelcomeRenderer as IWelcomeRenderer } from "@/ports/email/WelcomeRenderer";
import type { EmailTemplateOverride } from "@/ports/email/EmailTemplateOverride";
import { WelcomeEmail } from "./WelcomeEmail";

export class WelcomeTemplateRenderer implements IWelcomeRenderer {
  render(args: { firstName: string; dashboardUrl: string } & EmailTemplateOverride): ReactElement {
    return WelcomeEmail(args);
  }
}
