/**
 * WelcomeEmail — sent once a student's email address is verified.
 *
 * Distinct from EmailVerificationEmail (which asks the student to verify);
 * this one confirms the account is fully active and points at the dashboard.
 */

import { Button, Heading, Text } from "@react-email/components";
import { EmailDetailsCard, EmailDetail, EmailLayout, emailStyles } from "./EmailLayout";
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
      <Heading as="h1" style={emailStyles.title}>
        {headlineOverride ?? `Welcome, ${firstName}!`}
      </Heading>
      <Text style={emailStyles.body}>
        {introBodyOverride ??
          "Your email is verified and your account is ready. Head to your dashboard to start your first course, track your XP, and unlock the practice simulators."}
      </Text>

      <EmailDetailsCard>
        <EmailDetail label="Your account">Verified and ready to learn</EmailDetail>
        <EmailDetail label="Next step">Choose a course and start your first lesson</EmailDetail>
      </EmailDetailsCard>
      <Button href={dashboardUrl} style={emailStyles.button}>
        {ctaLabelOverride ?? "Go to your dashboard"}
      </Button>
    </EmailLayout>
  );
}
