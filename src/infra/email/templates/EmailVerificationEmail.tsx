/**
 * EmailVerificationEmail — sent on signup to verify the user's email.
 *
 * STORY-045: EmailSender port + React Email templates.
 */

import { Button, Heading, Text } from "@react-email/components";
import { EmailLayout } from "./EmailLayout";

export interface EmailVerificationEmailProps {
  firstName: string;
  verificationUrl: string;
  expiresInHours: number;
}

export function EmailVerificationEmail({
  firstName,
  verificationUrl,
  expiresInHours,
}: EmailVerificationEmailProps) {
  return (
    <EmailLayout
      preview="Verify your Project Amazon PH Academy email address"
      eyebrow="Welcome to Project Amazon PH Academy"
    >
      <Heading as="h1" style={{ fontSize: "22px", margin: "0 0 16px 0", color: "#171717" }}>
        Welcome, {firstName}!
      </Heading>
      <Text style={{ margin: "0 0 24px 0", color: "#404040" }}>
        Thanks for signing up for Project Amazon PH Academy. To get started, please verify your
        email address by clicking the button below.
      </Text>

      <Button
        href={verificationUrl}
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
        Verify Email Address
      </Button>

      <Text style={{ margin: "24px 0 8px 0", color: "#737373", fontSize: "13px" }}>
        This link expires in {expiresInHours} hours. If it expires, you can request a new
        verification email from the login page.
      </Text>
      <Text style={{ margin: 0, color: "#737373", fontSize: "13px" }}>
        If the button doesn't work, copy and paste this link into your browser:
        <br />
        <span style={{ wordBreak: "break-all", color: "#1a365d" }}>{verificationUrl}</span>
      </Text>
    </EmailLayout>
  );
}
