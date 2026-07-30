/**
 * ReceiptRenderer port.
 *
 * Needed to construct a React element for the payment-receipt email
 * without importing infra directly. Mirrors `PasswordResetRenderer`.
 */

import type { ReactElement } from "react";

export interface ReceiptRenderer {
  render(args: {
    firstName: string;
    orderNumber: string;
    courseTitle: string;
    amountMinor: number;
    currency: string;
    paidAt: Date;
    receiptUrl: string;
  }): ReactElement;
}
