/**
 * CertificateDocument — the React PDF component for a Certificate.
 *
 * STORY-042: React PDF renderer port + certificate PDF.
 *
 * This is the ONLY place in the codebase that imports @react-pdf/renderer.
 * The domain, ports, and use case layers never see React or PDF.
 *
 * A4 landscape, single page. Branding assets (logo, signature) deferred
 * to a later story — this is intentionally a clean, simple layout to
 * validate the pipeline end-to-end.
 */

import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { CertificateRenderInput } from "@/ports/rendering/CertificateRenderer";

const styles = StyleSheet.create({
  page: {
    padding: 60,
    fontFamily: "Helvetica",
    backgroundColor: "#ffffff",
  },
  border: {
    flex: 1,
    borderWidth: 4,
    borderColor: "#1a365d",
    borderStyle: "solid",
    padding: 40,
    justifyContent: "center",
  },
  brand: {
    fontSize: 14,
    textAlign: "center",
    color: "#1a365d",
    marginBottom: 24,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 2,
  },
  title: {
    fontSize: 32,
    textAlign: "center",
    marginBottom: 8,
    fontFamily: "Helvetica-Bold",
    color: "#1a365d",
  },
  subtitle: {
    fontSize: 12,
    textAlign: "center",
    color: "#666",
    marginBottom: 40,
  },
  preamble: {
    fontSize: 12,
    textAlign: "center",
    color: "#333",
    marginBottom: 12,
  },
  recipient: {
    fontSize: 24,
    textAlign: "center",
    marginBottom: 24,
    fontFamily: "Helvetica-Bold",
    color: "#000",
  },
  postamble: {
    fontSize: 12,
    textAlign: "center",
    color: "#333",
    marginBottom: 12,
  },
  course: {
    fontSize: 20,
    textAlign: "center",
    marginBottom: 8,
    fontFamily: "Helvetica-Bold",
    color: "#1a365d",
  },
  tagline: {
    fontSize: 11,
    textAlign: "center",
    color: "#666",
    marginBottom: 40,
    fontStyle: "italic",
  },
  footer: {
    fontSize: 10,
    textAlign: "center",
    color: "#666",
    marginTop: "auto",
    paddingTop: 20,
  },
  hash: {
    fontSize: 7,
    textAlign: "center",
    color: "#999",
    marginTop: 4,
    fontFamily: "Courier",
  },
});

export function CertificateDocument({ input }: { input: CertificateRenderInput }) {
  const fullName = `${input.user.firstName} ${input.user.lastName}`.trim();
  const issuedDate = input.certificate.issuedAt.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.border}>
          <Text style={styles.brand}>PROJECT AMAZON PH ACADEMY</Text>
          <Text style={styles.title}>Certificate of Completion</Text>
          <Text style={styles.subtitle}>— awarded for excellence —</Text>

          <Text style={styles.preamble}>This is to certify that</Text>
          <Text style={styles.recipient}>{fullName}</Text>
          <Text style={styles.postamble}>has successfully completed the course</Text>
          <Text style={styles.course}>{input.course.title}</Text>
          {input.course.tagline ? (
            <Text style={styles.tagline}>{input.course.tagline}</Text>
          ) : null}

          <Text style={styles.footer}>Issued on {issuedDate}</Text>
          <Text style={styles.hash}>
            Verify at /certificates/{input.certificate.verificationHash}
          </Text>
        </View>
      </Page>
    </Document>
  );
}
