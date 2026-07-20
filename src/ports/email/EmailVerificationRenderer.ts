/**
 * EmailVerificationRenderer port — STORY-007.
 *
 * The use case (ResendVerification) needs to construct a React
 * element for the verification email. The element type comes from
 * `react`. The concrete template lives in `src/infra/email/templates/`
 * to keep the use case free of infra imports.
 *
 * This port is the inversion: the use case depends on the port,
 * and the composition root wires the port to the infra template.
 *
 * ADR-014: The use case passes the resulting React element to
 * EmailSender.send({ react }). The sender's job is to render and
 * deliver; the renderer's job is to choose the template.
 */

import type { ReactElement } from "react";

export interface EmailVerificationRenderer {
  /**
   * Build the React element for the verification email.
   */
  render(args: {
    firstName: string;
    verificationUrl: string;
    expiresInHours: number;
  }): ReactElement;
}
