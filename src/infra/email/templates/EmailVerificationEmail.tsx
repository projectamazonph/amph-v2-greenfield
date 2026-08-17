/**
 * EmailVerificationEmail — sent on signup to verify the user's email.
 *
 * STORY-045: EmailSender port + React Email templates.
 */

import { Button, Heading, Text } from "@react-email/components";
import { EmailLayout, EmailNotice, emailStyles } from "./EmailLayout";
import type { EmailTemplateOverride } from "@/ports/email/EmailTemplateOverride";

export interface EmailVerificationEmailProps extends EmailTemplateOverride {
  firstName: string;
  verificationUrl: string;
  expiresInHours: number;
}

export function EmailVerificationEmail({
  firstName,
  verificationUrl,
  expiresInHours,
  headlineOverride,
  introBodyOverride,
  ctaLabelOverride,
}: EmailVerificationEmailProps) {
  return (
    <EmailLayout
      preview="Verify your Project Amazon PH Academy email address"
      eyebrow="Welcome to Project Amazon PH Academy"
    >
      <Heading as="h1" style={emailStyles.title}>
        {headlineOverride ?? `Welcome, ${firstName}!`}
      </Heading>
      <Text style={emailStyles.body}>
        {introBodyOverride ??
          "Thanks for signing up for Project Amazon PH Academy. To get started, please verify your email address by clicking the button below."}
      </Text>

      <Button href={verificationUrl} style={emailStyles.button}>
        {ctaLabelOverride ?? "Verify Email Address"}
      </Button>

      <EmailNotice>
        This verification link expires in {expiresInHours} hours. If it expires, request a new link
        from the login page.
      </EmailNotice>
      <Text style={emailStyles.muted}>
        Button not working? Copy and paste this link into your browser:
        <br />
        <span style={{ ...emailStyles.link, wordBreak: "break-all" }}>{verificationUrl}</span>
      </Text>
    </EmailLayout>
  );
}
