/**
 * PasswordResetEmail — sent when a user requests a password reset.
 *
 * STORY-045: EmailSender port + React Email templates.
 */

import { Button, Heading, Text } from "@react-email/components";
import { EmailLayout, EmailNotice, emailStyles } from "./EmailLayout";
import type { EmailTemplateOverride } from "@/ports/email/EmailTemplateOverride";

export interface PasswordResetEmailProps extends EmailTemplateOverride {
  firstName: string;
  resetUrl: string;
  expiresInMinutes: number;
}

export function PasswordResetEmail({
  firstName,
  resetUrl,
  expiresInMinutes,
  headlineOverride,
  introBodyOverride,
  ctaLabelOverride,
}: PasswordResetEmailProps) {
  return (
    <EmailLayout preview="Reset your Project Amazon PH Academy password" eyebrow="Password reset">
      <Heading as="h1" style={emailStyles.title}>
        {headlineOverride ?? "Reset your password"}
      </Heading>
      <Text style={{ ...emailStyles.body, marginBottom: "8px" }}>
        {introBodyOverride ??
          `Hi ${firstName}, we received a request to reset the password for your Project Amazon PH Academy account.`}
      </Text>
      <Text style={emailStyles.body}>
        Click the button below to choose a new password. If you didn't request this, you can safely
        ignore this email.
      </Text>

      <Button href={resetUrl} style={emailStyles.button}>
        {ctaLabelOverride ?? "Reset Password"}
      </Button>

      <EmailNotice tone="warning">
        For your security, this one-time link expires in {expiresInMinutes} minutes. If you did not
        request it, you can safely ignore this email.
      </EmailNotice>
    </EmailLayout>
  );
}
