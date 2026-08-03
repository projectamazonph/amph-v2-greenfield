/**
 * Default RefundTemplateRenderer — wraps the RefundEmail React Email
 * template.
 *
 * Mirrors `PasswordResetTemplateRenderer`. Named `RefundTemplateRenderer`
 * (not `RefundRenderer`) to avoid colliding with the port name when both
 * are imported in the same file (container.ts).
 */

import type { ReactElement } from "react";
import type { RefundRenderer as IRefundRenderer } from "@/ports/email/RefundRenderer";
import type { EmailTemplateOverride } from "@/ports/email/EmailTemplateOverride";
import { RefundEmail } from "./RefundEmail";

export class RefundTemplateRenderer implements IRefundRenderer {
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
  ): ReactElement {
    return RefundEmail(args);
  }
}
