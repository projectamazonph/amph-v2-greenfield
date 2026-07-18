/**
 * CertificateEmail — sent when a certificate is issued.
 *
 * STORY-045: EmailSender port + React Email templates.
 *
 * The PDF (from RenderCertificatePdf, STORY-042) is attached so the
 * student has a copy in their inbox. The verify URL in the body lets
 * them share the public verification page.
 */

import { Button, Heading, Section, Text } from "@react-email/components";
import { EmailLayout } from "./EmailLayout";

export interface CertificateEmailProps {
  firstName: string;
  courseTitle: string;
  verificationHash: string;
  verifyUrl: string;
}

export function CertificateEmail({
  firstName,
  courseTitle,
  verificationHash,
  verifyUrl,
}: CertificateEmailProps) {
  return (
    <EmailLayout
      preview={`Your certificate for ${courseTitle} is ready`}
      eyebrow="Course completed"
    >
      <Heading as="h1" style={{ fontSize: "22px", margin: "0 0 16px 0", color: "#171717" }}>
        Congratulations, {firstName}!
      </Heading>
      <Text style={{ margin: "0 0 24px 0", color: "#404040" }}>
        You completed <strong>{courseTitle}</strong>. Your certificate of completion is
        attached to this email as a PDF.
      </Text>

      <Section
        style={{
          backgroundColor: "#F4F3EE",
          padding: "20px",
          borderRadius: "6px",
          margin: "0 0 24px 0",
          textAlign: "center",
        }}
      >
        <Text style={{ margin: "0 0 8px 0", fontSize: "12px", color: "#737373", textTransform: "uppercase", letterSpacing: "0.1em" }}>
          Verification hash
        </Text>
        <Text
          style={{
            margin: 0,
            fontSize: "13px",
            color: "#1a365d",
            fontFamily: "monospace",
            wordBreak: "break-all",
          }}
        >
          {verificationHash}
        </Text>
      </Section>

      <Button
        href={verifyUrl}
        style={{
          backgroundColor: "#FF6B35",
          color: "#ffffff",
          fontSize: "15px",
          fontWeight: 600,
          textDecoration: "none",
          padding: "12px 24px",
          borderRadius: "6px",
          display: "inline-block",
        }}
      >
        View Public Certificate
      </Button>

      <Text style={{ margin: "24px 0 0 0", color: "#737373", fontSize: "13px" }}>
        Share your public certificate link with employers, on LinkedIn, or wherever you
        want to showcase your accomplishment. Anyone with the link can verify it.
      </Text>
    </EmailLayout>
  );
}
