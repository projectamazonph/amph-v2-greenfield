/**
 * PasswordChangedEmail — confirmation sent after a successful password
 * reset (ResetPassword use case, STORY-008).
 *
 * Replaces the previous `react: null` placeholder send, which produced an
 * email with no real body.
 */

import { Heading, Text } from "@react-email/components";
import { EmailLayout } from "./EmailLayout";

export interface PasswordChangedEmailProps {
  firstName: string;
  changedAt: Date;
}

export function PasswordChangedEmail({ firstName, changedAt }: PasswordChangedEmailProps) {
  return (
    <EmailLayout preview="Your password was changed" eyebrow="Security notice">
      <Heading as="h1" style={{ fontSize: "22px", margin: "0 0 16px 0", color: "#171717" }}>
        Your password was changed
      </Heading>
      <Text style={{ margin: "0 0 16px 0", color: "#404040" }}>
        Hi {firstName}, this confirms your Project Amazon PH Academy password was changed on{" "}
        {changedAt.toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })}
        . All of your existing sessions have been signed out.
      </Text>
      <Text style={{ margin: 0, color: "#737373", fontSize: "13px" }}>
        If you didn't make this change, contact support immediately — someone else may have access
        to your account.
      </Text>
    </EmailLayout>
  );
}
