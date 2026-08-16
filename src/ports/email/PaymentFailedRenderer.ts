/**
 * PaymentFailedRenderer port for provider-authoritative payment-failure events.
 */

import type { ReactElement } from "react";

export interface PaymentFailedRenderer {
  render(args: { firstName: string; courseTitle: string; retryUrl: string }): ReactElement;
}
