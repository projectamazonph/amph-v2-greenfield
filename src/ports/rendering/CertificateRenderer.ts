/**
 * CertificateRenderer port — renders a Certificate as a PDF buffer.
 *
 * STORY-042: React PDF renderer port + certificate PDF.
 *
 * The port takes pre-fetched data (not IDs) so it stays pure — no IO,
 * no repository access. The use case is the orchestrator that does the
 * lookups. This makes the renderer trivially testable with plain data
 * fixtures, and keeps the domain/usecase layers React-free.
 *
 * The adapter (infra/pdf/ReactPdfCertificateRenderer.ts) is the only
 * place that imports @react-pdf/renderer.
 */

import type { Certificate } from "@/domain/entities/Certificate";

/** Minimal user shape the renderer needs. Avoids leaking the full User entity. */
export interface CertificateRenderUser {
  readonly firstName: string;
  readonly lastName: string;
  readonly email: string;
}

/** Minimal course shape the renderer needs. */
export interface CertificateRenderCourse {
  readonly title: string;
  readonly tagline: string;
}

export interface CertificateRenderInput {
  readonly certificate: Certificate;
  readonly user: CertificateRenderUser;
  readonly course: CertificateRenderCourse;
}

export interface CertificateRenderer {
  /**
   * Render the certificate as a PDF. Returns a Node Buffer of the
   * raw PDF bytes. The caller streams the buffer to the response
   * (Next.js route handler) or attaches it to an email.
   *
   * **Throw contract:** On any failure (PDF library error, missing
   * font, invalid input data, etc.) the implementation MUST throw an
   * `Error` whose `message` describes the failure and whose `cause`
   * wraps the original error. Callers MUST treat this as a "never
   * resolves with a buffer" path — use a try/catch or Result wrapper.
   *
   * The use case layer converts throws to
   * `Result<{ buffer, hash }, render_error>`.
   */
  render(input: CertificateRenderInput): Promise<Buffer> | never;
}
