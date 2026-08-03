/**
 * WelcomeEmail — sent once a student's email address is verified.
 *
 * Distinct from EmailVerificationEmail (which asks the student to verify);
 * this one confirms the account is fully active and points at the dashboard.
 */

import { Button, Heading, Text } from "@react-email/components";
import { EmailLayout } from "./EmailLayout";
import type { EmailTemplateOverride } from "@/ports/email/EmailTemplateOverride";

export interface WelcomeEmailProps extends EmailTemplateOverride {
  firstName: string;
  dashboardUrl: string;
}

export function WelcomeEmail({
  firstName,
  dashboardUrl,
  headlineOverride,
  introBodyOverride,
  ctaLabelOverride,
}: WelcomeEmailProps) {
  return (
    <EmailLayout
      preview={`Welcome, ${firstName} — your account is ready`}
      eyebrow="Account verified"
    >
      <Heading as="h1" style={{ fontSize: "22px", margin: "0 0 16px 0", color: "#171717" }}>
        {headlineOverride ?? `Welcome, ${firstName}!`}
      </Heading>
      <Text style={{ margin: "0 0 24px 0", color: "#404040" }}>
        {introBodyOverride ??
          "Your email is verified and your account is ready. Head to your dashboard to start your first course, track your XP, and unlock the practice simulators."}
      </Text>

      <Button
        href={dashboardUrl}
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
        {ctaLabelOverride ?? "Go to your dashboard"}
      </Button>
    </EmailLayout>
  );
}
