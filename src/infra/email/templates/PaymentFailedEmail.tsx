/**
 * PaymentFailedEmail — notifies a buyer their payment didn't go through.
 *
 * Sent by the authenticated checkout-failure return flow after its pending
 * order is transitioned to FAILED.
 */

import { Button, Heading, Text } from "@react-email/components";
import { EmailLayout, EmailNotice, emailStyles } from "./EmailLayout";

export interface PaymentFailedEmailProps {
  firstName: string;
  courseTitle: string;
  retryUrl: string;
}

export function PaymentFailedEmail({ firstName, courseTitle, retryUrl }: PaymentFailedEmailProps) {
  return (
    <EmailLayout
      preview={`Your payment for ${courseTitle} didn't go through`}
      eyebrow="Payment failed"
    >
      <Heading as="h1" style={emailStyles.title}>
        Your payment didn&apos;t go through
      </Heading>
      <Text style={emailStyles.body}>
        Hi {firstName}, we couldn&apos;t complete your payment for <strong>{courseTitle}</strong>.
        No charge was made. You can try again below — if a payment method was declined, use a
        different one.
      </Text>

      <Button href={retryUrl} style={emailStyles.button}>
        Try again
      </Button>
      <EmailNotice tone="warning">
        No charge was made. If your payment method was declined, try a different method or contact
        your provider for help.
      </EmailNotice>
    </EmailLayout>
  );
}
