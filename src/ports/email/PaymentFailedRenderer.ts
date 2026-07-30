/**
 * PaymentFailedRenderer port. Not consumed by any usecase yet — see
 * src/infra/email/templates/PaymentFailedEmail.tsx for why.
 */

import type { ReactElement } from "react";

export interface PaymentFailedRenderer {
  render(args: { firstName: string; courseTitle: string; retryUrl: string }): ReactElement;
}
