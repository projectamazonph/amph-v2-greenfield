# STORY-042 — React PDF Renderer Port + Certificate PDF

## Status

- **Story**: STORY-042
- **Sprint**: 9 — Certificates + Email
- **Points**: 1
**Status:** Done (PR #47, commit de17fc2)

## Overview

Render a Certificate as a PDF buffer using `@react-pdf/renderer`. Lays the
groundwork for STORY-043 (public `/certificates/[hash]/pdf` route) and
STORY-045 (email attachment).

**Scope of this story:**
- `CertificateRenderer` port (interface returning `Buffer`)
- `CertificateDocument` React component (the actual `@react-pdf/renderer` JSX)
- `ReactPdfCertificateRenderer` adapter (wraps `renderToBuffer`)
- `StaticCertificateRenderer` test fake (returns deterministic bytes)
- `RenderCertificatePdf` use case (looks up cert + user + course, calls renderer)
- Wire into the DI container

**Out of scope:**
- The public route — STORY-043
- QR code on the PDF — deferred (could be 043 or 045)
- Email attachment — STORY-045
- Branding assets (logo, signature) — design pass, separate story

## 1. Port

```typescript
// src/ports/rendering/CertificateRenderer.ts

export interface CertificateRenderInput {
  readonly certificate: Certificate;
  readonly user: { firstName: string; lastName: string; email: string };
  readonly course: { title: string; tagline: string };
}

export interface CertificateRenderer {
  /**
   * Render the certificate PDF. Returns a Node Buffer containing the
   * raw PDF bytes. The caller is responsible for streaming these
   * bytes to the response (Next.js route handler, email attachment, etc.).
   */
  render(input: CertificateRenderInput): Promise<Buffer>;
}
```

Buffer (not Blob, not Uint8Array) — Node-native, easy to stream, easy to
attach to an email later.

## 2. Document Component

```tsx
// src/infra/pdf/CertificateDocument.tsx

import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { CertificateRenderInput } from "@/ports/rendering/CertificateRenderer";

const styles = StyleSheet.create({
  page: { padding: 60, fontFamily: "Helvetica" },
  title: { fontSize: 36, textAlign: "center", marginBottom: 40, fontFamily: "Helvetica-Bold" },
  recipient: { fontSize: 18, textAlign: "center", marginVertical: 20 },
  course: { fontSize: 22, textAlign: "center", fontFamily: "Helvetica-Bold" },
  footer: { fontSize: 10, textAlign: "center", marginTop: 60, color: "#666" },
  hash: { fontSize: 8, textAlign: "center", marginTop: 4, color: "#999" },
});

export function CertificateDocument({ input }: { input: CertificateRenderInput }) {
  const fullName = `${input.user.firstName} ${input.user.lastName}`;
  const issuedDate = input.certificate.issuedAt.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <Text style={styles.title}>Certificate of Completion</Text>
        <Text style={styles.recipient}>This is to certify that</Text>
        <Text style={styles.recipient}>{fullName}</Text>
        <Text style={styles.recipient}>has successfully completed</Text>
        <Text style={styles.course}>{input.course.title}</Text>
        <Text style={styles.footer}>Issued on {issuedDate}</Text>
        <Text style={styles.hash}>
          Verify at /certificates/{input.certificate.verificationHash}
        </Text>
      </Page>
    </Document>
  );
}
```

A4 landscape, single page. Branding assets (logo, signature) deferred to a
later story — this is intentionally a clean, simple layout to validate
the pipeline end-to-end.

## 3. Adapters

```typescript
// src/infra/pdf/ReactPdfCertificateRenderer.ts
import { renderToBuffer } from "@react-pdf/renderer";
import { CertificateDocument } from "@/infra/pdf/CertificateDocument";

export class ReactPdfCertificateRenderer implements CertificateRenderer {
  async render(input: CertificateRenderInput): Promise<Buffer> {
    return renderToBuffer(<CertificateDocument input={input} />);
  }
}
```

```typescript
// src/infra/pdf/StaticCertificateRenderer.ts (test fake)
import type { CertificateRenderer, CertificateRenderInput } from "@/ports/rendering/CertificateRenderer";

export class StaticCertificateRenderer implements CertificateRenderer {
  async render(input: CertificateRenderInput): Promise<Buffer> {
    // Fake PDF: a minimal valid PDF header so callers/tests that
    // sniff the magic bytes still pass. 13 bytes is the minimum.
    const payload = JSON.stringify({
      kind: "fake_pdf",
      certificateId: input.certificate.id,
      hash: input.certificate.verificationHash,
    });
    return Buffer.from(`%PDF-1.4\n%${payload}\n%%EOF`, "utf8");
  }
}
```

The fake starts with `%PDF-` so byte-magic tests (checking the buffer
is a real PDF) work in unit tests without actually rendering.

## 4. Use Case

```typescript
// src/usecases/RenderCertificatePdf.ts

export interface RenderCertificatePdfInput {
  certificateId: string;
}

export type RenderCertificatePdfError =
  | { kind: "certificate_not_found" }
  | { kind: "user_not_found" }
  | { kind: "course_not_found" }
  | { kind: "render_error"; message: string }
  | { kind: "db_error"; message: string };

export type RenderCertificatePdfResult = Result<
  { buffer: Buffer; verificationHash: string },
  RenderCertificatePdfError
>;

export interface RenderCertificatePdfDeps {
  certificateRepo: ICertificateRepository;
  userRepo: UserRepository;
  courseRepo: CourseRepository;
  renderer: CertificateRenderer;
}
```

**Flow:**
1. Find certificate by id → `certificate_not_found`
2. Find user → `user_not_found`
3. Find course → `course_not_found`
4. Call `renderer.render({ certificate, user, course })` → `render_error` on throw
5. Return `{ buffer, verificationHash }`

Note: We don't gate on cert `status` here — the public view (STORY-043)
decides whether to display revoked certs. The PDF itself includes the
"Verify at /certificates/{hash}" line; the revocation badge is the
public view's concern.

## 5. Container Wiring

```typescript
// In AppContainer:
renderer: CertificateRenderer;
renderCertificatePdf: RenderCertificatePdf;
```

- prod: `ReactPdfCertificateRenderer` (uses `@react-pdf/renderer`)
- test: `StaticCertificateRenderer` (deterministic fake)

## 6. Tests

- `RenderCertificatePdf` use case: happy path, certificate not found, user
  not found, course not found, renderer throws → render_error
- `StaticCertificateRenderer`: returns a buffer starting with `%PDF-`
- `ReactPdfCertificateRenderer` (integration test, NOT in unit suite):
  renders a real PDF and asserts the buffer starts with `%PDF-`. This
  test uses `@react-pdf/renderer` directly so it's slow — put it in
  `tests/integration/` if the project has that convention, else keep it
  in `tests/unit/` but tag it as integration. (TBD — see open question.)
- Container: both `renderer` and `renderCertificatePdf` wired

## 7. Files

| File | Change |
|---|---|
| `src/ports/rendering/CertificateRenderer.ts` | New — port |
| `src/infra/pdf/CertificateDocument.tsx` | New — React component |
| `src/infra/pdf/ReactPdfCertificateRenderer.ts` | New — prod adapter |
| `src/infra/pdf/StaticCertificateRenderer.ts` | New — test fake |
| `src/usecases/RenderCertificatePdf.ts` | New — use case |
| `src/composition/container.ts` | Wire renderer + use case |
| `tests/unit/usecases/RenderCertificatePdf.test.ts` | New — use case tests |
| `tests/unit/composition/container.test.ts` | Add wiring test |
| `docs/stories/STORY-042.md` | This doc |

## 8. Design Decisions

- **Buffer, not Uint8Array** — Node-native, can be passed straight to
  Next.js `new Response(buffer, { headers: { "content-type": "application/pdf" } })`
  or to an email attachment API.
- **Renderer port takes already-fetched data, not IDs** — keeps the port
  pure (no IO). The use case is the orchestrator that does the lookups.
  This makes the renderer trivially testable with plain data fixtures.
- **Document component lives in `src/infra/pdf/`** — it's the only place
  that imports `@react-pdf/renderer`. Domain/ports/usecases never see
  React or PDF.
- **No branding yet** — no logo, no signature, no certificate number
  on the PDF face. STORY-043/045 may add these; the renderer can be
  extended to accept them via the input shape.
- **Revoked certs still render** — the PDF is a historical artifact.
  The public view (STORY-043) is what decides to show a "REVOKED"
  badge overlay.
- **Integration test for the real renderer** — `@react-pdf/renderer` has
  no DOM dependency for the buffer path, so this can run in node
  without jsdom. The test is slow (~50ms) but still acceptable in the
  unit suite. Will revisit if it becomes a bottleneck.
