/**
 * WelcomeRenderer port.
 *
 * The use case (VerifyEmail) needs to construct a React element for the
 * post-verification welcome email without importing infra directly.
 * Mirrors `EmailVerificationRenderer` / `PasswordResetRenderer`.
 */

import type { ReactElement } from "react";

export interface WelcomeRenderer {
  render(args: { firstName: string; dashboardUrl: string }): ReactElement;
}
