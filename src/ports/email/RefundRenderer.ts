/**
 * RefundRenderer port.
 *
 * Needed to construct a React element for the refund-processed email
 * without importing infra directly. Mirrors `PasswordResetRenderer`.
 */

import type { ReactElement } from "react";
import type { EmailTemplateOverride } from "@/ports/email/EmailTemplateOverride";

export interface RefundRenderer {
  render(
    args: {
      firstName: string;
      orderNumber: string;
      courseTitle: string;
      amountMinor: number;
      currency: string;
      refundedAt: Date;
      reason: string;
    } & EmailTemplateOverride,
  ): ReactElement;
}
