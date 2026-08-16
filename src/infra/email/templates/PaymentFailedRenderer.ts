/**
 * Default PaymentFailedRenderer — wraps the PaymentFailedEmail React Email
 * template for a future provider-authoritative payment-failure event.
 */

import type { ReactElement } from "react";
import type { PaymentFailedRenderer as IPaymentFailedRenderer } from "@/ports/email/PaymentFailedRenderer";
import { PaymentFailedEmail } from "./PaymentFailedEmail";

export class PaymentFailedTemplateRenderer implements IPaymentFailedRenderer {
  render(args: { firstName: string; courseTitle: string; retryUrl: string }): ReactElement {
    return PaymentFailedEmail(args);
  }
}
