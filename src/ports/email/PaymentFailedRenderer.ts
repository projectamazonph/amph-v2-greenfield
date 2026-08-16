/**
 * PaymentFailedRenderer port for the authenticated failed-checkout flow.
 */

import type { ReactElement } from "react";

export interface PaymentFailedRenderer {
  render(args: { firstName: string; courseTitle: string; retryUrl: string }): ReactElement;
}
