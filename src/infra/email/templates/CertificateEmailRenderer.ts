/**
 * Default CertificateEmailRenderer — wraps the CertificateEmail React
 * Email template.
 *
 * Mirrors `PasswordResetTemplateRenderer`. Distinct from
 * `ReactPdfCertificateRenderer` (@/ports/security/CertificateRenderer),
 * which renders the certificate PDF, not this email.
 */

import type { ReactElement } from "react";
import type { CertificateEmailRenderer as ICertificateEmailRenderer } from "@/ports/email/CertificateEmailRenderer";
import { CertificateEmail } from "./CertificateEmail";

export class CertificateEmailTemplateRenderer implements ICertificateEmailRenderer {
  render(args: {
    firstName: string;
    courseTitle: string;
    verificationHash: string;
    verifyUrl: string;
  }): ReactElement {
    return CertificateEmail(args);
  }
}
