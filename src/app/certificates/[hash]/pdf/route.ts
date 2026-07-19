/**
 * GET /certificates/[hash]/pdf — Public Certificate PDF download
 * STORY-043
 *
 * Anyone with the hash can download the PDF. No auth.
 * The PDF is a historical artifact — even revoked certificates
 * are downloadable (per STORY-042's design decision).
 *
 * Flow:
 *  1. Verify hash + fetch cert metadata (verifyCertificate use case)
 *  2. Render the PDF (renderCertificatePdf use case)
 *  3. Stream the buffer back as application/pdf
 *
 * Errors:
 *  - 404 if cert not found
 *  - 500 if render fails
 */

import { NextResponse } from "next/server";
import { buildContainer } from "@/composition/container";

export async function GET(
  _req: Request,
  context: { params: Promise<{ hash: string }> },
): Promise<Response> {
  const { hash } = await context.params;
  const container = buildContainer();

  // ── 1. Verify hash + fetch cert metadata ─────────────────
  const verifyResult = await container.verifyCertificate.execute({
    verificationHash: hash,
  });

  if (!verifyResult.ok) {
    if (verifyResult.error.kind === "certificate_not_found" ||
        verifyResult.error.kind === "invalid_hash_format") {
      return NextResponse.json(
        { error: { kind: verifyResult.error.kind, message: "Certificate not found" } },
        { status: 404 },
      );
    }
    if (verifyResult.error.kind === "user_not_found" ||
        verifyResult.error.kind === "course_not_found") {
      // Data integrity issue — log and return 500
      console.error("[certificates/pdf] data integrity error:", verifyResult.error);
      return NextResponse.json(
        { error: { kind: "internal_error", message: "Certificate data is corrupt" } },
        { status: 500 },
      );
    }
    // db_error
    console.error("[certificates/pdf] db error:", verifyResult.error);
    return NextResponse.json(
      { error: { kind: "db_error", message: "Internal server error" } },
      { status: 500 },
    );
  }

  const { certificate } = verifyResult.value;

  // ── 2. Render the PDF ─────────────────────────────────────
  const renderResult = await container.renderCertificatePdf.execute({
    certificateId: certificate.id,
  });

  if (!renderResult.ok) {
    console.error("[certificates/pdf] render error:", renderResult.error);
    if (renderResult.error.kind === "render_error") {
      return NextResponse.json(
        { error: { kind: "render_error", message: "Failed to render certificate" } },
        { status: 500 },
      );
    }
    return NextResponse.json(
      { error: { kind: "internal_error", message: "Failed to render certificate" } },
      { status: 500 },
    );
  }

  const { buffer, verificationHash } = renderResult.value;

  // ── 3. Stream the PDF back ─────────────────────────────────
  // Convert Node Buffer to a Uint8Array view that the Web Response constructor
  // accepts. Buffer is a subclass of Uint8Array, but the Web Fetch types
  // want BodyInit; the simplest cross-runtime is to pass the buffer directly.
  return new Response(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="certificate-${verificationHash.slice(0, 8)}.pdf"`,
      "Content-Length": String(buffer.length),
      "Cache-Control": "public, max-age=300, s-maxage=300",
    },
  });
}
