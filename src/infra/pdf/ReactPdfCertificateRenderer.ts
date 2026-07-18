/**
 * ReactPdfCertificateRenderer — production adapter for CertificateRenderer.
 *
 * STORY-042: React PDF renderer port + certificate PDF.
 *
 * Wraps @react-pdf/renderer's `renderToBuffer` with our React component.
 * This is the only place in the codebase that creates the JSX element
 * tree (the Document component itself is a separate file so it can be
 * tested visually in isolation later if needed).
 */

import { createElement } from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import type {
  CertificateRenderer,
  CertificateRenderInput,
} from "@/ports/rendering/CertificateRenderer";
import { CertificateDocument } from "@/infra/pdf/CertificateDocument";

export class ReactPdfCertificateRenderer implements CertificateRenderer {
  async render(input: CertificateRenderInput): Promise<Buffer> {
    // Cast: createElement returns ReactElement<{ input }, ...> but the
    // @react-pdf/renderer DocumentProps type is stricter. The runtime
    // is happy — CertificateDocument is a valid document component.
    const element = createElement(CertificateDocument, { input });
    return renderToBuffer(element as Parameters<typeof renderToBuffer>[0]);
  }
}
