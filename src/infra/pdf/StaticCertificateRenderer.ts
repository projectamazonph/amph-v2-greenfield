/**
 * StaticCertificateRenderer — test fake for CertificateRenderer.
 *
 * STORY-042: React PDF renderer port + certificate PDF.
 *
 * Returns a minimal "PDF" buffer that starts with the %PDF- magic bytes
 * so byte-level tests (asserting the result is a PDF) still pass without
 * actually rendering. Deterministic — same input = same output.
 *
 * NOT for production. The real adapter (ReactPdfCertificateRenderer)
 * is the one that actually renders.
 */

import type {
  CertificateRenderer,
  CertificateRenderInput,
} from "@/ports/rendering/CertificateRenderer";

export class StaticCertificateRenderer implements CertificateRenderer {
  async render(input: CertificateRenderInput): Promise<Buffer> {
    // The body is a JSON payload so test assertions can introspect it.
    // The header/footer are minimal valid PDF syntax so the magic-byte
    // check works.
    const body = JSON.stringify({
      kind: "fake_pdf",
      certificateId: input.certificate.id,
      userEmail: input.user.email,
      courseTitle: input.course.title,
      hash: input.certificate.verificationHash,
    });
    return Buffer.from(`%PDF-1.4\n%${body}\n%%EOF\n`, "utf8");
  }
}
