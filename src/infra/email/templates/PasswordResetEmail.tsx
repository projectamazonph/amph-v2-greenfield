/**
 * PasswordResetEmail — sent when a user requests a password reset.
 *
 * STORY-045: EmailSender port + React Email templates.
 */

import { Button, Heading, Text } from "@react-email/components";
import { EmailLayout } from "./EmailLayout";
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
      <Heading as="h1" style={{ fontSize: "22px", margin: "0 0 16px 0", color: "#171717" }}>
        {headlineOverride ?? "Reset your password"}
      </Heading>
      <Text style={{ margin: "0 0 8px 0", color: "#404040" }}>
        {introBodyOverride ??
          `Hi ${firstName}, we received a request to reset the password for your Project Amazon PH Academy account.`}
      </Text>
      <Text style={{ margin: "0 0 24px 0", color: "#404040" }}>
        Click the button below to choose a new password. If you didn't request this, you can safely
        ignore this email.
      </Text>

      <Button
        href={resetUrl}
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
        {ctaLabelOverride ?? "Reset Password"}
      </Button>

      <Text style={{ margin: "24px 0 8px 0", color: "#737373", fontSize: "13px" }}>
        This link expires in {expiresInMinutes} minutes.
      </Text>
      <Text style={{ margin: 0, color: "#737373", fontSize: "13px" }}>
        For your security, this link can only be used once. If it expires, request a new one from
        the login page.
      </Text>
    </EmailLayout>
  );
}
