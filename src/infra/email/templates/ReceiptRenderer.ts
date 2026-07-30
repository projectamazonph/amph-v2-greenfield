/**
 * Default ReceiptRenderer — wraps the ReceiptEmail React Email template.
 *
 * Mirrors `PasswordResetTemplateRenderer`.
 */

import type { ReactElement } from "react";
import type { ReceiptRenderer as IReceiptRenderer } from "@/ports/email/ReceiptRenderer";
import { ReceiptEmail } from "./ReceiptEmail";

export class ReceiptTemplateRenderer implements IReceiptRenderer {
  render(args: {
    firstName: string;
    orderNumber: string;
    courseTitle: string;
    amountMinor: number;
    currency: string;
    paidAt: Date;
    receiptUrl: string;
  }): ReactElement {
    return ReceiptEmail(args);
  }
}
