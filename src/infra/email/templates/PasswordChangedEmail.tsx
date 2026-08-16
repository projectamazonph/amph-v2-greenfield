/**
 * PasswordChangedEmail — confirmation sent after a successful password
 * reset (ResetPassword use case, STORY-008).
 *
 * Replaces the previous `react: null` placeholder send, which produced an
 * email with no real body.
 */

import { Heading, Text } from "@react-email/components";
import { EmailLayout, EmailNotice, emailStyles } from "./EmailLayout";

export interface PasswordChangedEmailProps {
  firstName: string;
  changedAt: Date;
}

export function PasswordChangedEmail({ firstName, changedAt }: PasswordChangedEmailProps) {
  return (
    <EmailLayout preview="Your password was changed" eyebrow="Security notice">
      <Heading as="h1" style={emailStyles.title}>
        Your password was changed
      </Heading>
      <Text style={emailStyles.body}>
        Hi {firstName}, this confirms your Project Amazon PH Academy password was changed on{" "}
        {changedAt.toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })}
        . All of your existing sessions have been signed out.
      </Text>
      <EmailNotice tone="warning">
        If you did not make this change, contact support immediately. Someone else may have access
        to your account.
      </EmailNotice>
    </EmailLayout>
  );
}
