/**
 * CertificateEmail — sent when a certificate is issued.
 *
 * STORY-045: EmailSender port + React Email templates.
 *
 * The PDF (from RenderCertificatePdf, STORY-042) is attached so the
 * student has a copy in their inbox. The verify URL in the body lets
 * them share the public verification page.
 */

import { Button, Heading, Text } from "@react-email/components";
import { EmailDetail, EmailDetailsCard, EmailLayout, emailStyles } from "./EmailLayout";
import type { EmailTemplateOverride } from "@/ports/email/EmailTemplateOverride";

export interface CertificateEmailProps extends EmailTemplateOverride {
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
  headlineOverride,
  introBodyOverride,
  ctaLabelOverride,
}: CertificateEmailProps) {
  return (
    <EmailLayout
      preview={`Your certificate for ${courseTitle} is ready`}
      eyebrow="Course completed"
    >
      <Heading as="h1" style={emailStyles.title}>
        {headlineOverride ?? `Congratulations, ${firstName}!`}
      </Heading>
      <Text style={emailStyles.body}>
        {introBodyOverride ?? (
          <>
            You completed <strong>{courseTitle}</strong>. Your certificate of completion is attached
            to this email as a PDF.
          </>
        )}
      </Text>

      <EmailDetailsCard>
        <EmailDetail label="Course">{courseTitle}</EmailDetail>
        <EmailDetail label="Verification hash">
          <span
            style={{
              color: "#1A365D",
              fontFamily: "monospace",
              fontSize: "13px",
              wordBreak: "break-all",
            }}
          >
            {verificationHash}
          </span>
        </EmailDetail>
      </EmailDetailsCard>

      <Button href={verifyUrl} style={emailStyles.button}>
        {ctaLabelOverride ?? "View Public Certificate"}
      </Button>

      <Text style={emailStyles.muted}>
        Share your public certificate link with employers, on LinkedIn, or wherever you want to
        showcase your accomplishment. Anyone with the link can verify it.
      </Text>
    </EmailLayout>
  );
}
