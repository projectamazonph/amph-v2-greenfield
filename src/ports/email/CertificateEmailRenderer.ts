/**
 * CertificateEmailRenderer port.
 *
 * The use case (IssueCertificate) needs to construct a React element for
 * the certificate-issued email without importing infra directly. Named
 * distinctly from `@/ports/security/CertificateRenderer` (the PDF renderer
 * port) to avoid confusion between the two unrelated concerns.
 */

import type { ReactElement } from "react";

export interface CertificateEmailRenderer {
  render(args: {
    firstName: string;
    courseTitle: string;
    verificationHash: string;
    verifyUrl: string;
  }): ReactElement;
}
