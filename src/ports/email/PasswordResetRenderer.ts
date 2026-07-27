/**
 * PasswordResetRenderer port — STORY-008.
 *
 * The use case (RequestPasswordReset) needs to construct a React
 * element for the password-reset email. The element type comes
 * from `react`. The concrete template lives in
 * `src/infra/email/templates/` to keep the use case free of
 * infra imports.
 *
 * This port is the inversion: the use case depends on the port,
 * and the composition root wires the port to the infra template.
 *
 * Mirrors `EmailVerificationRenderer` (STORY-007).
 */

import type { ReactElement } from "react";

export interface PasswordResetRenderer {
  /**
   * Build the React element for the password-reset email.
   */
  render(args: { firstName: string; resetUrl: string; expiresInMinutes: number }): ReactElement;
}
