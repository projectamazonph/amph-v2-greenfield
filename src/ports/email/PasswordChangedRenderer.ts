/**
 * PasswordChangedRenderer port.
 *
 * The use case (ResetPassword) needs to construct a React element for the
 * password-changed confirmation email without importing infra directly.
 * Mirrors `PasswordResetRenderer`.
 */

import type { ReactElement } from "react";

export interface PasswordChangedRenderer {
  render(args: { firstName: string; changedAt: Date }): ReactElement;
}
